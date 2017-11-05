function trackerTable() {

    this.str = '';
    this.getTable = function () {
        return '<table id="tracker-table">' + this.str + '</table>';
    };

    this.setHeader = function (numRows, data) {
        this.str += `<tr class="tracker-row header">`;
        this.str += this.getCells('header', numRows, { header: true });
        this.str += `</tr>`;

    };

    this.setRows = function (numRows, numCols, data) {

        this.setHeader(numCols, data);
        for (let rowID = 0; rowID < numRows; rowID++) {
            this.str += `<tr class="tracker-row" data-id="${rowID}">`;
            this.str += this.getCells(rowID, numCols, data);
            this.str += `</tr>`;
        }
    };

    this.getFirstCell = function (rowID, data) {
        var str = '';
        
        str += `<td class="tracker-first-cell" data-row-id="${rowID}">`;
        if (data.title) { 
            str += data.title[rowID];
        }
        
        str += `</td>`;
        return str;
    };

    this.getCells = function (rowID, numRows, data) {
        var str = '';

        str += this.getFirstCell(rowID, data);

        let cssClass = 'tracker-cell'

        if (rowID == 'header') {
            cssClass = 'tracker-cell-header'
        }

        for (let c = 0; c < numRows; c++) {
            str += `<td class="${cssClass}" data-row-id="${rowID}" data-col-id="${c}">`;
            if (data.header) {
                str += c + 1;
            }
            str += `</td>`;
        }
        return str;
    };
}

module.exports = trackerTable;
