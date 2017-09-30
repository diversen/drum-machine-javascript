function trackerTable() {

    this.str = '';
    this.getTable = function () {
        return '<table id="tracker-table">' + this.str + '</table>';
    };

    this.setHeader = function (numCells, data) {
        this.str += `<tr class="tracker-row header">`;
        this.str += this.getCells('header', numCells, { header: true });
        this.str += `</tr>`;

    };

    this.setRows = function (numRows, numCells, data) {

        this.setHeader(numCells, data);
        for (let rowID = 0; rowID < numRows; rowID++) {
            this.str += `<tr class="tracker-row" data-id="${rowID}">`;
            this.str += this.getCells(rowID, numCells, data);
            this.str += `</tr>`;
        }
    };

    this.getFirstCell = function (rowID, data) {
        var str = '';
        
        str += `<td class="tracker-cell tracker-first-cell" data-row-id="${rowID}">`;
        if (data.title) { 
            str += data.title[rowID];
        }
        
        str += `</td>`;
        return str;
    };

    this.getCells = function (rowID, numCells, data) {
        var str = '';

        str += this.getFirstCell(rowID, data);

        for (let c = 0; c < numCells; c++) {
            str += `<td class="tracker-cell" data-row-id="${rowID}" data-cell-id="${c}">`;
            if (data.header) {
                str += c + 1;
            }
            str += `</td>`;
        }
        return str;
    };
}

module.exports = trackerTable;
