/**
 * Hand-written QR Code Generator
 * Supports Version 1 (21x21), Byte Mode, Low Error Correction (L)
 */

const QR = (() => {
  // --- Galois Field 256 for Reed-Solomon ---
  const gfExp = new Uint8Array(512);
  const gfLog = new Uint8Array(256);
  (() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      gfExp[i] = x;
      gfLog[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d; // Polynomial x^8 + x^4 + x^3 + x^2 + 1
    }
    for (let i = 255; i < 512; i++) gfExp[i] = gfExp[i - 255];
  })();

  function gfMul(x, y) {
    if (x === 0 || y === 0) return 0;
    return gfExp[gfLog[x] + gfLog[y]];
  }

  // --- Reed-Solomon ---
  function getGeneratorPolynomial(degree) {
    let g = new Uint8Array([1]);
    for (let i = 0; i < degree; i++) {
      let next = new Uint8Array(g.length + 1);
      for (let j = 0; j < g.length; j++) {
        next[j] ^= gfMul(g[j], gfExp[i]);
        next[j + 1] ^= g[j];
      }
      g = next;
    }
    return g;
  }

  function calculateErrorCorrection(data, ecCount) {
    const gen = getGeneratorPolynomial(ecCount);
    let msg = new Uint8Array(data.length + ecCount);
    msg.set(data);
    for (let i = 0; i < data.length; i++) {
      let coef = msg[i];
      if (coef !== 0) {
        let logCoef = gfLog[coef];
        for (let j = 0; j < gen.length; j++) {
          msg[i + j] ^= gfExp[logCoef + gfLog[gen[j]]];
        }
      }
    }
    return msg.slice(data.length);
  }

  // --- QR Matrix Construction ---
  const SIZE = 21; // Version 1

  function createMatrix() {
    return Array.from({ length: SIZE }, () => new Int8Array(SIZE).fill(-1));
  }

  function setFinderPattern(matrix, row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r, cc = col + c;
        if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) {
          const isDark = (r >= 0 && r <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)));
          matrix[rr][cc] = isDark ? 1 : 0;
        }
      }
    }
  }

  function setTimingPatterns(matrix) {
    for (let i = 8; i < SIZE - 8; i++) {
      matrix[6][i] = (i % 2 === 0) ? 1 : 0;
      matrix[i][6] = (i % 2 === 0) ? 1 : 0;
    }
  }

  function setFormatInfo(matrix, mask) {
    // Version 1, L error correction, Mask 0 (000)
    // Precomputed format info for simplicity: 0x77c4 (L, Mask 0)
    const format = 0x77c4; 
    for (let i = 0; i < 15; i++) {
      const bit = (format >> i) & 1;
      if (i < 6) matrix[i][8] = bit;
      else if (i < 8) matrix[i + 1][8] = bit;
      else matrix[SIZE - 15 + i][8] = bit;

      if (i < 8) matrix[8][SIZE - 1 - i] = bit;
      else if (i < 9) matrix[8][15 - i - 1 + 1] = bit; // dark module
      else matrix[8][15 - i - 1] = bit;
    }
    matrix[SIZE - 8][8] = 1; // Always dark module
  }

  // --- Main Generate Function ---
  return {
    generate: (text) => {
      const matrix = createMatrix();
      
      // 1. Reserved patterns
      setFinderPattern(matrix, 0, 0);
      setFinderPattern(matrix, 0, SIZE - 7);
      setFinderPattern(matrix, SIZE - 7, 0);
      setTimingPatterns(matrix);
      setFormatInfo(matrix, 0);

      // 2. Encode Data (Byte Mode)
      let bits = "";
      bits += "0100"; // Byte mode
      bits += text.length.toString(2).padStart(8, '0');
      for (let i = 0; i < text.length; i++) {
        bits += text.charCodeAt(i).toString(2).padStart(8, '0');
      }
      
      // Padding
      const capacity = 19 * 8; // Version 1-L capacity in bits
      bits += "0000"; // Terminator
      while (bits.length % 8 !== 0) bits += "0";
      const padBytes = [0xEC, 0x11];
      let p = 0;
      while (bits.length < capacity) {
        bits += padBytes[p].toString(2).padStart(8, '0');
        p = (p + 1) % 2;
      }

      const dataBytes = new Uint8Array(19);
      for (let i = 0; i < 19; i++) {
        dataBytes[i] = parseInt(bits.substr(i * 8, 8), 2);
      }

      // 3. Error Correction
      const ecBytes = calculateErrorCorrection(dataBytes, 7);
      const allBytes = new Uint8Array([...dataBytes, ...ecBytes]);

      // 4. Place Bits
      let bitIndex = 0;
      let allBits = "";
      allBytes.forEach(b => allBits += b.toString(2).padStart(8, '0'));

      for (let c = SIZE - 1; c > 0; c -= 2) {
        if (c === 6) c--; // Skip timing pattern column
        const upward = ((c + 1) / 2) % 2 !== 0;
        for (let r = 0; r < SIZE; r++) {
          const row = upward ? (SIZE - 1 - r) : r;
          for (let col = c; col > c - 2; col--) {
            if (matrix[row][col] === -1) {
              const bit = allBits[bitIndex++] === '1' ? 1 : 0;
              // Apply Mask 0: (row + col) % 2 == 0
              matrix[row][col] = ((row + col) % 2 === 0) ? (bit ^ 1) : bit;
            }
          }
        }
      }

      return matrix;
    },
    
    toCanvas: (text, scale = 10) => {
      const matrix = QR.generate(text);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = SIZE * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "black";
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (matrix[r][c] === 1) {
            ctx.fillRect(c * scale, r * scale, scale, scale);
          }
        }
      }
      return canvas;
    }
  };
})();
