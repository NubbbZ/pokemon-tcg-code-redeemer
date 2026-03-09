const STORAGE_KEY = 'pokemon_tcg_codes';
let scannedCodes = [];
let lastCode = "";

// To enforce the use of the new api with detailed scan results, call the constructor with an options object, see below.
const scanner = new QrScanner(
    document.getElementById('qr-code-viewer'),
    result => addNewCode(result.data),
    { /* your options or returnDetailedScanResult: true if you're not specifying any other options */ },
);

function run() {
    scanner.start()
        .then(() => {
            QrScanner.listCameras(true).then(cameras => cameras.forEach(camera => {
                const option = document.createElement('option');
                option.value = camera.id;
                option.text = camera.label;
                $('#cam-list').append(option);
            }));
        })
        .catch(err => {
            postUpdate("Failed to start camera: " + err);
        });

    $('#cam-list').on('change', function (event) {
        scanner.setCamera(event.target.value);
    });

    $('.copy-to-clipboard').on('click', function (e) {
        e.preventDefault();

        copyAllCodesToClipboard();

        postUpdate("All codes have been copied to your clipboard");
    });

    $('.import-from-clipboard').on('click', function (e) {
        e.preventDefault();

        importCodesFromClipboard();
    });

    $('.clear-codes').on('click', function (e) {
        e.preventDefault();

        if (confirm('Are you sure you want to clear all codes?')) {
            scannedCodes = [];
            saveCodes();
            drawCodes();
            postUpdate("All codes have been cleared");
        }
    });
}

function sanitizeCode(code) {
    const prefix = "https://pokemon.com/redeem?2d_code=";
    if (code && code.indexOf(prefix) === 0) {
        return code.substring(prefix.length);
    }
    return code;
}

function addNewCode(code) {
    code = sanitizeCode(code);

    const position = scannedCodes.findIndex(val => val.code === code);

    if (position > -1 && lastCode === code) {
        return;
    }
    else if (position > -1) {
        scannedCodes[position].scanCount++;

        postUpdate(code + " has already been scanned " + scannedCodes[position].scanCount + " times");

        lastCode = code;

        return;
    }
    else {
        postUpdate(code + " has been scanned");

        lastCode = code;
    }

    scannedCodes.splice(0, 0, { code: code, scanned: new Date().toISOString(), copied: false, scanCount: 1, copyCount: 0 });

    saveCodes();
    drawCodes();
}

function drawCodes() {
    $('.recent-body').html('');
    $('.full-body').html('');

    for (let i = 0; i < Math.min(scannedCodes.length, 6); i++) {
        $('.recent-body').append($(getRecentRow(scannedCodes[i])));
    }

    for (let i = 0; i < scannedCodes.length; i++) {
        $('.full-body').append($(getFullRow(scannedCodes[i], i + 1)));
    }
}

function getRecentRow(scannedCode) {
    const row = $('<tr>')
        .append($('<td>').text(scannedCode.code));
    row.on('click', function () {
        copyAndMarkCode(scannedCode.code);
    });

    return row;
}

function getFullRow(scannedCode, position) {
    const copiedClass = scannedCode.copied ? "fa-check" : "fa-times";
    const rowCopiedClass = scannedCode.copied ? "copied" : "";

    const row = $('<tr>', { class: rowCopiedClass })
        .append($('<td>', { class: "d-none d-md-table-cell" }).text(position))
        .append($('<td>').text(scannedCode.code))
        .append($('<td>', { class: "d-none d-md-table-cell" }).text(getDateAsDisplayString(scannedCode.scanned)))
        .append($('<td>')
            .append($('<i>', { class: "fa-solid " + copiedClass }))
        );

    row.on('click', function () {
        copyAndMarkCode(scannedCode.code);
    });

    return row;
}

function copyAllCodesToClipboard() {
    const codes = scannedCodes.map(c => c.code).join('\n');
    navigator.clipboard.writeText(codes);
}

function importCodesFromClipboard() {
    navigator.clipboard.readText()
    .then(clipboardContent => {
        scannedCodes = [];

        const lines = clipboardContent.split(/\r|\n/).filter(n => n);
        for (let i = 0; i < lines.length; i++) {
            const cells = lines[i].split('\t');
    
            const newCode = {};
            for (let c = 0; c < cells.length; c++) {
                if (c === 0) {
                    newCode.code = cells[c];
                }
                if (c === 1) {
                    newCode.scanned = cells[c];
                }
                if (c === 2) {
                    newCode.copied = cells[c] === 'true';
                }
                if (c === 3) {
                    newCode.scanCount = parseInt(cells[c], 10);
                }
                if (c === 4) {
                    newCode.copyCount = parseInt(cells[c], 10);
                }
            }

            scannedCodes.push(newCode);
        }

        saveCodes();
        drawCodes();
        postUpdate("Your codes have been imported");
    })
    .catch(() => {
        postUpdate("Failed to read clipboard contents");
    });
}

function copyAndMarkCode(code) {
    navigator.clipboard.writeText(code);

    const copyCount = markCodeAsCopied(code);

    saveCodes();
    drawCodes();

    if (copyCount > 1) {
        postUpdate(code + " has already been copied " + copyCount + " times");
    }
    else {
        postUpdate(code + " copied to clipboard");
    }
}

function markCodeAsCopied(code) {
    const position = scannedCodes.findIndex(val => val.code === code);

    scannedCodes[position].copied = true;
    scannedCodes[position].copyCount++;

    return scannedCodes[position].copyCount;
}

function postUpdate(update) {
    $('.header-updates').fadeOut(250, function () {
        $('.header-updates').html(update);

        $('.header-updates').fadeIn(1000);
    });
}

function getDateAsDisplayString(date) {
    const dateAsDate = new Date(date);

    const timeString = dateAsDate.getHours() + ":" + String(dateAsDate.getMinutes()).padStart(2, '0');
    const dateString = dateAsDate.getDate() + "/" + (dateAsDate.getMonth() + 1) + "/" + dateAsDate.getFullYear();

    return timeString + " " + dateString;
}

function saveCodes() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(scannedCodes));
    } catch (e) {
        console.warn('Could not save codes to localStorage:', e);
    }
}

function loadCodes() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            scannedCodes = JSON.parse(saved);
        }
    } catch (e) {
        console.warn('Could not load codes from localStorage:', e);
    }
}

$(document).ready(function () {
    loadCodes();
    drawCodes();
    run();
});