function trackerTableSvg() {

    this.str = '';
    this.options = {
        cellFirst: 120,
        cellWidth: 16,
        cellSpace: 4
    }

    this.options.cellWithSpace = this.options.cellSpace + this.options.cellWidth
    this.options.cellFirstWithSpace = this.options.cellFirst + this.options.cellSpace

    /**
     * @param int number of cells
     * @param int number of rows
     * @param object data
     */
    this.setRows = function (numRows, numRows, data) {

        this.numRows = numRows;
        this.numRows = numRows;

        this.setHeader(numRows, data);
        for (let rowID = 0; rowID < numRows; rowID++) {
            this.str += this.getCells(rowID, numRows, data);
        }
    };

    this.setHeader = function (numRows, data) {
        this.str += this.getCells('header', numRows, { header: true });
    };

    this.getTable = function () {

        
        let boxX = (this.options.cellFirst + this.options.cellSpace) + 
                   (this.numRows * this.options.cellWithSpace)
        let boxY = (this.numRows + 1) * (this.options.cellWithSpace)

        let html = `
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            preserveAspectRatio="none" 
            viewBox="0 0 ${boxX} ${boxY}" 
            class="tracker">
            <g>`;
        html += this.str;
        html += `
            </g>
        </svg>`
        return html
    };

    this.getFirstCell = function (rowID, data) {

        let str = '';
        str += `
            <rect
                class="tracker-cell-first" 
                data-row-id="${rowID}" 
                width="${this.options.cellFirst}" 
                height="${this.options.cellWidth}" 
                x="0" 
                y="${this.y}"></rect>`;
        
        if (data.title) {
            let text = data.title[rowID];
            str += `
                <text 
                    class="tracker-cell-text"
                    x="${this.options.cellSpace}"
                    y="${this.y+12}">${text}
                </text>`;
        }

        this.currentX = this.options.cellFirstWithSpace
        return str;
    };

    this.currentX = 0
    this.getCurrentX = function (x) {
        return x + this.currentX
    }

    this.y = 0;
    this.getCells = function (rowID, numRows, data) {
        var str = '';
        var x = 0;

        // Get first cell. E.g. instrument
        str += this.getFirstCell(rowID, data);
        for (let c = 0; c < numRows; c++) {
            
            str += `
            <rect 
                class="tracker-cell" 
                data-row-id="${rowID}" 
                data-col-id="${c}" 
                width="${this.options.cellWidth}" 
                height="${this.options.cellWidth}" 
                x="${this.getCurrentX(x)}" 
                y="${this.y}">
            </rect>`;

            if (data.header) {
                // column header. A number
                let text = c + 1;
                str += `
                <text 
                    
                    class="tracker-cell-text" 
                    data-row-id="${rowID}" 
                    data-col-id="${c}" 
                    x="${this.getCurrentX(x+2)}" 
                    y="12">${text}
                </text>`;
            }
            
            x += this.options.cellWithSpace
        }

        this.y += this.options.cellWithSpace
        return str;
    };
}

module.exports = trackerTableSvg;
