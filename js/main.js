var scannedCodes = [];
var lastCode = "";

// To enforce the use of the new api with detailed scan results, call the constructor with an options object, see below.
const scanner = new QrScanner(
    document.getElementById('qr-code-viewer'),
    result => addNewCode(result.data),
    { /* your options or returnDetailedScanResult: true if you're not specifying any other options */ },
);

function run() {
    scanner.start().then(() => {
        // List cameras after the scanner started to avoid listCamera's stream and the scanner's stream being requested
        // at the same time which can result in listCamera's unconstrained stream also being offered to the scanner.
        // Note that we can also start the scanner after listCameras, we just have it this way around in the demo to
        // start the scanner earlier.
        QrScanner.listCameras(true).then(cameras => cameras.forEach(camera => {
            const option = document.createElement('option');
            option.value = camera.id;
            option.text = camera.label;
            $('#cam-list').append(option);
        }));
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
}

function addNewCode(code) {
    var position = scannedCodes.indexOf(scannedCodes.filter(function (val) {
        return val.code === code;
    })[0]);

    if (position > -1 && lastCode == code) {
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

    scannedCodes.splice(0, 0, { code: code, scanned: Date(), copied: false, scanCount: 1, copyCount: 0 });

    drawCodes();
}

function drawCodes() {
    $('.recent-body').html('');
    $('.full-body').html('');

    for (var i = 0; i < Math.min(scannedCodes.length, 6); i++) {
        $('.recent-body').append($(getRecentRow(scannedCodes[i])));
    }

    for (var i = 0; i < scannedCodes.length; i++) {
        $('.full-body').append($(getFullRow(scannedCodes[i], i + 1)));
    }
}

function getRecentRow(scannedCode) {
    var row = $('<tr>')
        .append($('<td>', { html: scannedCode.code }));
    $(row).on('click', function () {
        copyAndMarkCode(scannedCode.code);
    });

    return $(row);
}

function getFullRow(scannedCode, position) {
    var copiedClass = "fa-check";
    var rowCopiedClass = "copied";

    if (!scannedCode.copied) {
        copiedClass = "fa-times";
        rowCopiedClass = "";
    }

    var row = $('<tr>', { class: rowCopiedClass })
        .append($('<td>', { class: "d-none d-md-table-cell", html: position }))
        .append($('<td>', { html: scannedCode.code }))
        .append($('<td>', { class: "d-none d-md-table-cell", html: getDateAsDisplayString(scannedCode.scanned) }))
        .append($('<td>')
            .append($('<i>', { class: "fa-solid " + copiedClass }))
        );

    $(row).on('click', function () {
        copyAndMarkCode(scannedCode.code);
    });

    return $(row);
}

function copyAllCodesToClipboard() {
    var codes = "";
    var newLine = "\n"

    for (var i = 0; i < scannedCodes.length; i++) {
        codes += scannedCodes[i].code + newLine;
    }

    navigator.clipboard.writeText(codes);
}

function importCodesFromClipboard() {
    navigator.clipboard.readText()
    .then(clipboardContent => {
        scannedCodes = [];

        var lines = clipboardContent.split(/\r|\n/).filter(n => n);
        for (var i = 0; i < lines.length; i++) {
            var cells = lines[i].split('\t');
    
            var newCode = {};
            for (var c = 0; c < cells.length; c++) {
                if (c == 0) {
                    newCode.code = cells[c];
                }
                if (c == 1) {
                    newCode.scanned = cells[c];
                }
                if (c == 2) {
                    newCode.copied = cells[c] === 'true';
                }
                if (c == 3) {
                    newCode.scanCount = cells[c];
                }
                if (c == 4) {
                    newCode.copyCount = cells[c];
                }
            }

            scannedCodes.push(newCode);
        }

        drawCodes();
        postUpdate("Your codes have been imported");
    })
    .catch(err => {
        postUpdate("Failed to read clipboard contents");
    });
}

function cleanImportText(text) {
    return text.trim
}

function copyAndMarkCode(code) {
    navigator.clipboard.writeText(code);

    var copyCount = markCodeAsCopied(code);

    drawCodes();

    if (copyCount > 1) {
        postUpdate(code + " has already been copied " + copyCount + " times");
    }
    else {
        postUpdate(code + " copied to clipboard");
    }
}

function markCodeAsCopied(code) {
    var position = scannedCodes.indexOf(scannedCodes.filter(function (val) {
        return val.code === code;
    })[0]);

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
    var dateAsDate = new Date(date);

    var timeString = dateAsDate.getHours() + ":" + dateAsDate.getMinutes();
    var dateString = dateAsDate.getDay() + "/" + dateAsDate.getMonth() + "/" + dateAsDate.getFullYear();

    return timeString + " " + dateString;
}

$(document).ready(function () {
    run();

    //Debug
    //for (var i = 1; i < 20; i++) {
    //    addNewCode("Test " + i);
    //}
});