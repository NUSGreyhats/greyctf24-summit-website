const bingoBoard = document.getElementById('bingo-board');
const scanButton = document.getElementById('scan-button');
const bingoTab = document.getElementById('bingo-tab');
const scanTab = document.getElementById('scan-tab');
let scanner;
let boardState = Array(4).fill().map(() => Array(4).fill(null));
const scans = JSON.parse(localStorage.getItem("scans") ?? "[]");
localStorage.setItem("scans", JSON.stringify(scans));

// Create bingo board
for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 4; j++) {
    const cell = document.createElement('div');
    cell.className = 'bingo-cell';
    cell.textContent = names[i * 4 + j];
    cell.addEventListener('click', () => showCellModal(names[i * 4 + j], items[names[i * 4 + j]]));
    cell.dataset.row = i;
    cell.dataset.col = j;
    bingoBoard.appendChild(cell);
  }
}

// Show modal for cell
function showCellModal(title, content) {
  const modalTitle = document.getElementById('cellModalLabel');
  const modalBody = document.getElementById('cellModalBody');
  modalTitle.textContent = title;
  modalBody.innerHTML = content;

  umami.track('Bingo View', {name: title});
  const modal = new bootstrap.Modal(document.getElementById('cellModal'));
  modal.show();
}

// Initialize QR scanner
function initializeScanner() {
  for (const scan of scans) {
    processQRCode(scan, true);
  }
  scanner = new Html5Qrcode("reader", { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] });
  const qrCodeSuccessCallback = (decodedText, decodedResult) => {
    console.log(`Code matched = ${decodedText}`, decodedResult);
    scans.push(decodedText);
    localStorage.setItem("scans", JSON.stringify(scans));
    processQRCode(decodedText);
    bingoTab.click(); // Switch back to the Bingo tab
  };
  const config = { fps: 10, qrbox: { width: 250, height: 250 } };


  scanTab.addEventListener('shown.bs.tab', () => {
    scanner.start({ facingMode: "environment" }, config, qrCodeSuccessCallback);
  });

  bingoTab.addEventListener('shown.bs.tab', () => {
    scanner.stop()
  });
}

// Process QR code data
function processQRCode(data, scanned = false) {
  const [rowIndex, colIndex, rowData, colData, diagData] = data.split(';');
  const cell = document.querySelector(`.bingo-cell[data-row="${rowIndex}"][data-col="${colIndex}"]`);
  if (cell) {
    if (!scanned) {
      const name = names[parseInt(rowIndex) * 4 + parseInt(colIndex)];
      umami.track('Bingo Stamp - ' + name);
    }

    cell.classList.add('marked');
    cell.dataset.rowData = rowData;
    cell.dataset.colData = colData;
    cell.dataset.diagData = diagData;
    boardState[rowIndex][colIndex] = { rowData, colData, diagData };
    checkBingo(parseInt(rowIndex), parseInt(colIndex));
  }
}

// Check for bingo
function checkBingo(row, col) {
  let bingoData = null;
  let i = null;

  // Check row
  if (boardState[row].every(cell => cell !== null)) {
    bingoData = boardState[row].map(cell => cell.rowData).join('');
    console.log("Row Bingo!", bingoData);
    i = row;
  }

  // Check column
  if (boardState.every(row => row[col] !== null)) {
    bingoData = boardState.map(row => row[col].colData).join('');
    console.log("Column Bingo!", bingoData);
    i = col + 4;
  }

  // Check main diagonal
  if (row === col && boardState.every((row, i) => row[i] !== null)) {
    bingoData = boardState.map((row, i) => row[i].diagData).join('');
    console.log("Main Diagonal Bingo!", bingoData);
    i = 8;
  }

  // Check anti-diagonal
  if (row + col === 3 && boardState.every((row, i) => row[3 - i] !== null)) {
    bingoData = boardState.map((row, i) => row[3 - i].diagData).join('');
    console.log("Anti-Diagonal Bingo!", bingoData);
    i = 9;
  }

  if (bingoData) {
    decryptChallenge(bingoData, i);
  }
}

function xorHexStrings(hex1, hex2) {
  // Ensure both strings are of equal length by padding the shorter one
  const maxLength = Math.max(hex1.length, hex2.length);
  hex1 = hex1.padStart(maxLength, '0');
  hex2 = hex2.padStart(maxLength, '0');

  let result = '';
  for (let i = 0; i < maxLength; i += 2) {
    // Convert each byte (2 hex characters) to decimal and XOR them
    const byte1 = parseInt(hex1.substr(i, 2), 16);
    const byte2 = parseInt(hex2.substr(i, 2), 16);
    const xoredByte = byte1 ^ byte2;
    // Convert the result back to hex and ensure it's two digits
    result += xoredByte.toString(16).padStart(2, '0');
  }
  return result;
}

const cts = ['29f4ded82eac73c80c15a6501cfcbc319affaa039a76dd91d196d94bb223fb4e', 'a0828fba9210fb25ecbab05ac3cf69762dcb35a5c155bb686b5070940a8ff7a1', '809aee5a4bc09c6f859c413ac211aa920efc92bfe39136f959f82b314dcc9bdc', '97a3e4bf5869feba75eb9a879c97651e33fcdc5aa70037784829afb6de59c95b', '2b23d8cf602ac0373c472943413624f4abed757e1bdd373e94ee8e9a98e41831', '7d284cd095304acd9eeebfd49e699fc9ca8e27e0fd2b1b3f079402b7d1504309', 'e41b42e8ca351be44e1bac2baeb99eef835e7601818a69be976b95ede17bfc2e', '93f9b024237a889f26323aef5d35f982be2588795c393305c4e35af4639b6f10', 'b0c28a0c0ed2de9852a06b54f05323f6aece9b724657bdd6c4653e81de29847e', '8f6b2e6772d0e929cad61a1f5628ccafccb21a67f7140e077db2e3e3c5046404'];

// Decrypt challenge
function decryptChallenge(bingoData, idx) {
  // Hex decode the bingo data
  const decodedData = CryptoJS.enc.Hex.parse(bingoData)
  console.log("Decoded Bingo Data:", decodedData);

  // Compute SHA256 hash
  const hash = CryptoJS.SHA256(decodedData);
  console.log("SHA256 Hash:", hash.toString());
  console.log(cts[idx])

  const res = CryptoJS.enc.Hex.parse(xorHexStrings(hash.toString(), cts[idx])).toString(CryptoJS.enc.Utf8).replaceAll("\x00", "");
  message.innerHTML = `Bingo! The flag is: <code>${res}</code>. Head over to the Greyhats booth to redeem your merch!`;

  umami.track('Bingo Completed');
}

// Initialize scanner when the page loads
window.onload = initializeScanner;