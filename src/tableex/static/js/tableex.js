/**
 * Column Resorting
 */

class ColumnResorter {
    draggedColumn = null;

    constructor(table) {
        this._table = table;
    }

    enableColumnResorting() {
        const cells = this._table.getElementsByTagName('th');
        Array.from(cells).forEach(cell => {
            cell.draggable = true;
            cell.addEventListener('dragstart', this.handleHeaderDragStart);
            cell.addEventListener('dragover', this.handleHeaderDragOver);
            cell.addEventListener('drop', this.handleHeaderDrop);
        })
    }

    handleHeaderDragStart = event => {
        this.draggedColumn = event.target;
    }

    handleHeaderDragOver = event => {
        event.preventDefault();
    }

    handleHeaderDrop = event => {
        event.preventDefault();

        const draggedColumnIndex = this.draggedColumn.cellIndex;
        const droppedColumnIndex = event.target.cellIndex;

        if (draggedColumnIndex === droppedColumnIndex) {
            return;
        }

        const rows = this._table.rows;
        Array.from(rows).forEach(row => {
            const cells = row.cells;
            const temp = cells[draggedColumnIndex].innerHTML;

            if (draggedColumnIndex < droppedColumnIndex) {
                for (let i = draggedColumnIndex; i < droppedColumnIndex; i++) {
                    cells[i].innerHTML = cells[i + 1].innerHTML;
                }
                cells[droppedColumnIndex].innerHTML = temp;
            } else {
                for (let i = draggedColumnIndex; i > droppedColumnIndex; i--) {
                    cells[i].innerHTML = cells[i - 1].innerHTML;
                }
                cells[droppedColumnIndex].innerHTML = temp;
            }
        });
    }
}

/**
 * Box Selecting
 */

class BoxSelector {
    isDragging = false;
    isSelecting = false;
    selectionStartCell = null;
    selectionEndCell = null;
    scrollingInterval = null;

    constructor(table) {
        this._table = table;
        this.scrollSpeed = 4;
        this.scrollSpeedMul = 5;
        this.scrollThresh1 = 0.2;
        this.scrollThresh2 = 0.1;
    }

    disableCellSelection() {
        const cells = this._table.getElementsByTagName('td');
        Array.from(cells).forEach(cell => {
            cell.setAttribute('unselectable', 'on');
            cell.addEventListener('selectstart', function (e) {
                e.preventDefault();
            })
        });
    }

    enableCellDraging() {
        const cells = this._table.getElementsByTagName('td');
        Array.from(cells).forEach(cell => {
            cell.draggable = true;
            cell.addEventListener('click', this.handleClick);
            cell.addEventListener('dragstart', this.handleDragStart);
            cell.addEventListener('dragenter', this.handleDragEnter);
            cell.addEventListener('dragover', this.handleDragOver);
            cell.addEventListener('dragend', this.handleDragEnd);
        })
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('click', this.handleResetSelection);
        window.addEventListener('dragstart', this.handleResetSelection);
    }

    clearSelection() {
        this.selectionStartCell = null;
        this.selectionEndCell = null;
        // // If there is a normal selection, remove it
        let selection = window.getSelection();
        if (selection.rangeCount > 0) {
            selection.removeAllRanges();
        }
    }

    handleClick = event => {
        this.clearSelection();
        this.isDragging = false;
        this.isSelecting = true;
        this.selectionStartCell = event.target;
        this.selectionEndCell = event.target;
        this.highlightSelection();
    }

    handleDragStart = event => {
        this.clearSelection();
        this.isDragging = true;
        this.selectionStartCell = event.target;
        this.selectionEndCell = event.target;
        event.dataTransfer.setDragImage(new Image(), 0, 0);
        this.highlightSelection();
    }

    handleDragEnter = event => {
        if (this.canEnterCell(event.target)) {
            this.selectionEndCell = event.target;
            this.highlightSelection();
        }
    }

    handleDragOver = event => {
        if (this.canEnterCell(event.target)) {
            this.handleScroll(event);
        }
    }

    handleDragEnd = event => {
        this.isDragging = false;
        this.isSelecting = true;
        this.stopScroll();
    }

    canEnterCell(target) {
        return (
            target.tagName === 'TD' &&
            this.selectionStartCell !== null &&
            this.selectionEndCell !== null
        );
    }

    claerHighlight() {
        const tr = this._table.getElementsByTagName('tr');
        for (let i = 0; i < tr.length; i++) {
            const td = tr[i].getElementsByTagName('td');
            for (let j = 0; j < td.length; j++) {
                td[j].classList.remove('highlight');
            }
        }
    }

    highlightSelection() {
        const tr = this._table.getElementsByTagName('tr');

        let startRowIndex = this.selectionStartCell.parentNode.rowIndex;
        let endRowIndex = this.selectionEndCell.parentNode.rowIndex;

        let startCellIndex = this.selectionStartCell.cellIndex;
        let endCellIndex = this.selectionEndCell.cellIndex;

        if (endRowIndex < startRowIndex) {
            [startRowIndex, endRowIndex] = [endRowIndex, startRowIndex];
        }
        if (endCellIndex < startCellIndex) {
            [startCellIndex, endCellIndex] = [endCellIndex, startCellIndex];
        }

        for (let i = 0; i < tr.length; i++) {
            const td = tr[i].getElementsByTagName('td');
            for (let j = 0; j < td.length; j++) {
                if ((i >= startRowIndex && i <= endRowIndex) && (j >= startCellIndex && j <= endCellIndex)) {
                    td[j].classList.add('highlight');
                } else {
                    td[j].classList.remove('highlight');
                }
            }
        }
    }

    handleKeyDown = event => {
        let nextFunc = null;
        switch (event.key) {
            case "ArrowDown":
                nextFunc = (cell) => cell.parentElement.nextElementSibling?.cells[cell.cellIndex];
                break;
            case "ArrowUp":
                nextFunc = (cell) => cell.parentElement.previousElementSibling?.cells[cell.cellIndex];
                break;
            case "ArrowLeft":
                nextFunc = (cell) => cell.previousElementSibling;
                break;
            case "ArrowRight":
                nextFunc = (cell) => cell.nextElementSibling;
                break;
        }
        if (nextFunc) {
            let moveFunc = event.ctrlKey ? this.getNextTerminalCell : this.getNextCell;
            if (!event.shiftKey) {
                this.selectionStartCell = this.selectionEndCell = moveFunc.bind(this)(nextFunc, this.selectionStartCell)
            }
            else {
                this.selectionEndCell = moveFunc.bind(this)(nextFunc, this.selectionEndCell)
            }
            
            this.highlightSelection();
        }

        if (event.ctrlKey && event.key === 'c') {
            if (this.isSelecting) {
                this.copyToClipboard(this.getSelectionText());
            }
        }
    }

    getNextCell(func, currentCell) {
        let possibleEndCell = func(currentCell);
        if (possibleEndCell) {
            return possibleEndCell;
        }
        else {
            return currentCell;
        }
    }

    getNextTerminalCell(func, currentCell) {
        let prevCell = null;
        while(prevCell !== currentCell) {
            prevCell = currentCell;
            currentCell = this.getNextCell(func, currentCell);
        }
        return currentCell
    }

    getSelectionText() {
        const tr = this._table.getElementsByTagName('tr');

        let startRowIndex = this.selectionStartCell.parentNode.rowIndex;
        let endRowIndex = this.selectionEndCell.parentNode.rowIndex;

        let startCellIndex = this.selectionStartCell.cellIndex;
        let endCellIndex = this.selectionEndCell.cellIndex;

        if (endRowIndex < startRowIndex) {
            [startRowIndex, endRowIndex] = [endRowIndex, startRowIndex];
        }
        if (endCellIndex < startCellIndex) {
            [startCellIndex, endCellIndex] = [endCellIndex, startCellIndex];
        }

        let selectingText = "";
        let firstRow = true;
        let firstCell = true;

        for (let i = startRowIndex; i <= endRowIndex; i++) {
            const td = tr[i].getElementsByTagName('td');
            if (!firstRow) {
                selectingText += '\n';
            }
            for (let j = startCellIndex; j <= endCellIndex; j++) {
                if (!firstCell) {
                    selectingText += '\t';
                }
                selectingText += td[j].textContent;
                firstCell = false;
            }
            firstRow = false;
            firstCell = true;
        }
        return selectingText;
    }

    copyToClipboard(content) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(content).then(() => {
                // 
            })
        } else {
            content.select();
            document.execCommand('copy');
        }
    }

    startVerticalScroll(direction) {
        this.stopScroll();
        this.scrollingInterval = setInterval(() => {
            window.scrollBy(0, direction * this.scrollSpeed * this.scrollSpeedMul);
        }, 10);
    }

    startHorizontalScroll(direction) {
        this.stopScroll();
        this.scrollingInterval = setInterval(() => {
            window.scrollBy(direction * this.scrollSpeed * this.scrollSpeedMul, 0);
        }, 10);
    }

    stopScroll() {
        clearInterval(this.scrollingInterval);
    }

    handleScroll = event => {
        const { clientX, clientY, target } = event;

        const top = 0;
        const bottom = window.innerHeight;
        const left = 0;
        const right = window.innerWidth;
        const threshY1 = bottom * this.scrollThresh1;
        const threshY2 = bottom * this.scrollThresh2;
        const threshX1 = right * this.scrollThresh1;
        const threshX2 = right * this.scrollThresh2;

        if (clientY <= top + threshY2) {
            this.startVerticalScroll(-1);
        } else if (clientY >= bottom - threshY2) {
            this.startVerticalScroll(1);
        } else if (clientX <= left + threshX2) {
            this.startHorizontalScroll(-1);
        } else if (clientX >= right - threshX2) {
            this.startHorizontalScroll(1);
        } else if (clientY <= top + threshY1) {
            window.scrollBy(0, -this.scrollSpeed);
        } else if (clientY >= bottom - threshY1) {
            window.scrollBy(0, this.scrollSpeed);
        } else if (clientX <= left + threshX1) {
            window.scrollBy(-this.scrollSpeed, 0);
        } else if (clientX >= right - threshX1) {
            window.scrollBy(this.scrollSpeed, 0);
        }

    }

    handleResetSelection = event => {
        if (event.target.tagName === 'TD') {
            return;
        }
        this.isDragging = false;
        this.isSelecting = false;
        this.selectionStartCell = null;
        this.selectionEndCell = null;
        this.claerHighlight();
    }
}

{
    const table = document.getElementById('tableex');
    if (table.hasAttribute('tableex-box-selectable')) {
        let boxSelector = new BoxSelector(table);
        boxSelector.disableCellSelection();
        boxSelector.enableCellDraging();
    }
    if (table.hasAttribute('tableex-column-resortable')) {
        let columnResorter = new ColumnResorter(table);
        columnResorter.enableColumnResorting();
    }
}
