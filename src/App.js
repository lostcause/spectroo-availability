import React, {useState} from "react";
import DateRangePicker from '@wojtekmaj/react-daterange-picker';
import ReactTooltip from 'react-tooltip';
import { CSVLink } from "react-csv";
// eslint-disable-next-line
import axios from "axios";
import clone from "clone";
import orderedLocations from "./response/locations.json";
// eslint-disable-next-line
const config = {
    headers: {
        'x-api-key': 'eral1u41tbRWKwkIw6J61VXyIym2Rl6s'
    }
};

const now = new Date();

export default class App extends React.Component {
    constructor(props) {
        super(props);
        this.onChange = this.onChange.bind(this);
        this.state = {
            response: [],
            isLoading: true,
            startDate: new Date(now.getFullYear(), now.getMonth(), 1),
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
            selectionStarted: false,
            startRow: null,
            startColumn: null,
            endRow: null,
            endColumn: null,
            addMode: null,
            value: null,
            dataToDownload: [],
            locations: [],
        };
    };

    componentDidMount() {
        window.addEventListener('mouseup', this.handleTouchEndWindow);
        window.addEventListener('touchend', this.handleTouchEndWindow);
        this.loadData();
    }

    loadData = () => {
        this.setState({isLoading: true});
        axios.get('https://synapse.network.tpsengage.com/spectroo/playlist', config)
            .then((responseData) => {
                this.setState({response: responseData.data.data}, () => {
                    this.setState({locations: orderedLocations});
                    const startDate = new Date(this.state.startDate.getTime());
                    const endDate = new Date(this.state.endDate.getTime());
                    const diffTime = Math.abs(endDate - startDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const values = [...Array(orderedLocations.length)].map((i, row) => {
                        return [...Array(diffDays)].map((j, column) => {
                            const date = new Date(startDate.addDays(column));
                            return {
                                group_id: orderedLocations[row].id,
                                date: date.toISOString(),
                                selected: false,
                            };
                        });
                    });
                    this.setState({value: values});
                    this.setState({isLoading: false});
                });
            })
            .catch((error) => {
                this.setState({isLoading: false});
                console.log(error);
            });
    };

    handleTouchEndWindow = (e) => {
        const isLeftClick = e.button === 0;
        const isTouch = e.type !== 'mousedown';
        if (this.state.selectionStarted && (isLeftClick || isTouch)) {
            const value = clone(this.state.value);
            const minRow = Math.min(this.state.startRow, this.state.endRow);
            const maxRow = Math.max(this.state.startRow, this.state.endRow);
            for (let row = minRow; row <= maxRow; row++) {
                const minColumn = Math.min(
                    this.state.startColumn,
                    this.state.endColumn
                );
                const maxColumn = Math.max(
                    this.state.startColumn,
                    this.state.endColumn
                );
                for (let column = minColumn; column <= maxColumn; column++) {
                    if(value[row][column])
                    {
                        value[row][column].selected = !this.state.addMode;
                    }
                }
            }
            this.setState({value: value});
            this.setState({ selectionStarted: false });
        }
    };

    onChange(value) {
        this.setState({startDate: value[0]});
        this.setState({endDate: value[1]});
        this.loadData();
    }

    download = () => {
        let value = this.state.value;
        let selected = [];
        for(let r = 0; r <= 68; r++)
        {
            for(let c = 0; c <= 30; c++)
            {
                if(value[r][c] !== undefined && value[r][c].selected)
                {
                    selected.push({id: value[r][c].group_id, date: value[r][c].date});
                }
            }
        }
        const groupByYear = groupBy('id');
        const sorted = groupByYear(selected);
        const exportData = Object.values(sorted).map(item => {
            let id = item[0].id;
            let dates = item.map(elem => elem.date).join(',');
            return {id, dates};
        });

        this.setState({ dataToDownload: exportData }, () => {
            //this.csvLink.link.click();
        });
    };

    handleTouchStartCell = (e) => {
        const isLeftClick = e.button === 0;
        const isTouch = e.type !== 'mousedown';
        if(!this.state.selectionStarted && (isLeftClick || isTouch))
        {
            e.preventDefault();
            const {row, column} = eventToCellLocation(e);
            this.setState({
                selectionStarted: true,
                startRow: row,
                startColumn: column,
                endRow: row,
                endColumn: column,
                addMode: this.state.value[row][column].selected,
            });
        }
    };

    handleTouchMoveCell = (e) => {
        if(this.state.selectionStarted) {
            e.preventDefault();
            const {row, column} = eventToCellLocation(e);
            const {startRow, startColumn, endRow, endColumn} = this.state;

            if(endRow !== row || endColumn !== column) {
                const nextRowCount =
                    startRow === null && endRow === null
                        ? 0
                        : Math.abs(row - startRow) + 1;
                const nextColumnCount =
                    startColumn === null && endColumn === null
                        ? 0
                        : Math.abs(column - startColumn) + 1;

                if(nextRowCount <= 69) {
                    this.setState({ endRow: row });
                }

                if(nextColumnCount <= 31) {
                    this.setState({ endColumn: column });
                }
            }
        }
    };

    isCellBeingSelected = (row, column) => {
        const minRow = Math.min(this.state.startRow, this.state.endRow);
        const maxRow = Math.max(this.state.startRow, this.state.endRow);
        const minColumn = Math.min(this.state.startColumn, this.state.endColumn);
        const maxColumn = Math.max(this.state.startColumn, this.state.endColumn);

        return (
            this.state.selectionStarted &&
            (row >= minRow &&
                row <= maxRow &&
                column >= minColumn &&
                column <= maxColumn)
        );
    };

    render() {
        if(this.state.isLoading) {
            return (
                <div>
                    <DatePicker
                        onChange={this.onChange}
                        value={[this.state.startDate, this.state.endDate]}
                    />
                    <p>Loading</p>
                </div>
            );
        }

        const locations = this.state.locations;
        const dates = [];
        const startDate = new Date(this.state.startDate.getTime());
        const endDate = new Date(this.state.endDate.getTime());
        for(let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
            dates.push(Date.parse(d));
        }

        const tableHeader = dates.map((item, index) => {
            let month = new Date(item).getMonth() + 1;
            return (
                <th style={{maxWidth: '48px'}} scope="col" key={index}>
                    {new Date(item).getDate()}.{month.toString().padStart(2, '0')}
                </th>
            );
        });

        const removeLocation = (id, index) => {
            let newLocations = clone(this.state.locations);
            let tempValue = clone(this.state.value);
            let tempResponse = clone(this.state.response);
            tempValue.splice(index, 1);
            newLocations.splice(index, 1);
            let newResponse = tempResponse.filter(item => {
                return item.group_id !== id
            });
            this.setState({value: tempValue});
            this.setState({response: newResponse});
            this.setState({locations: newLocations});
            tempValue = null;
            tempResponse = null;
        };

        const tableContent = locations.map((item, index) => {
            const usedDates = this.state.response.filter(location => location.group_id === item.id);
            return (
                <tr key={item.id}>
                    <td style={{whiteSpace: 'nowrap'}}>
                        <button onClick={() => removeLocation(item.id, index)}>&times;</button>
                        {item.name}
                    </td>
                    <TableRow
                        location={item}
                        usedDates={usedDates}
                        dates={dates}
                        data={this.state}
                        row={index}
                        handleTouchStartCell={this.handleTouchStartCell}
                        handleTouchMoveCell={this.handleTouchMoveCell}
                        isCellBeingSelected={this.isCellBeingSelected}
                    />
                </tr>
            );
        });

        return (
            <div>
                <DatePicker
                    onChange={this.onChange}
                    value={[this.state.startDate, this.state.endDate]}
                />

                <CSVLink data={this.state.dataToDownload}
                         filename="data.csv"
                         className="btn btn-success"
                         separator={"|"}
                         ref={(r) => this.csvLink = r}
                         asyncOnClick={true}
                         onClick={(event, done) => {
                             this.download();
                             done();
                         }}
                         target="_blank">Export CSV</CSVLink>
                <div className="table-responsive table-fixed">
                    <table className="table table-bordered">
                        <thead>
                        <tr>
                            <th/>
                            {tableHeader}
                        </tr>
                        </thead>
                        <tbody>
                        {tableContent}
                        </tbody>
                    </table>
                </div>
                <ReactTooltip multiline={true}/>
            </div>
        );
    }

}

class TableRow extends React.Component {

    render() {
        let {
            location,
            usedDates,
            dates,
            data,
            row,
            handleTouchStartCell,
            handleTouchMoveCell,
            isCellBeingSelected,
            ...props
        } = this.props;

        return dates.map((item, index) => {
            let count = 0;
            let campaigns = [];
            let currentDate = new Date(item);
            usedDates.map((data) => {
                let validFromDate = new Date(data.valid_from);
                let validToDate = new Date(data.valid_to);
                if(currentDate >= validFromDate && currentDate <= validToDate) {
                    campaigns.push(data?.tps?.campaign?.name);
                    count++;
                }
                return count;
            });
            campaigns = campaigns.map(d => {
               return `<br>${d}<br/>`
            }).join('');

            return (
                <Cell
                    key={index}
                    campaigns={campaigns}
                    valid={count < 3}
                    onTouchStart={handleTouchStartCell}
                    onTouchMove={handleTouchMoveCell}
                    count={count}
                    data={data}
                    selected={data.value[row][index]}
                    row={row}
                    column={index}
                    beingSelected={isCellBeingSelected(row, index)}
                    {...props}
                />
            );
        })
    }
}

class Cell extends React.Component {
    constructor() {
        super();
        this.state = { isShown: false }
    }
    render() {
        let {
            valid,
            count,
            data,
            onTouchStart,
            onTouchMove,
            selected,
            row,
            column,
            beingSelected,
            campaigns,
            ...props
        } = this.props;


        const handleHoverIn = () => {
            this.setState({isShown: true})
        };

        const handleHoverEnd = () => {
            this.setState({isShown: false})
        };

        const handleTouchStart = (e) => {
            if(e.target.classList[1] === 'selectable') {
                onTouchStart(e);
            }
        }

        const handleTouchMove = (e) => {
            if(e.target.classList[1] === 'selectable') {
                onTouchMove(e);
            }
        };

        let className = valid ? 'bg-success selectable' : 'bg-danger';

        if(selected && selected.selected && valid)
        {
            className += ' cell-selected';
        }

        if(!valid)
        {
            data.value[row][column] = false;
        }

        if (beingSelected && valid) {
            className += ' cell-being-selected';
        }

        return (
            <td data-tip={campaigns} data-multiline={true} style={{textAlign: 'center', userSelect: 'none'}}
                className={className}
                onMouseEnter={handleHoverIn.bind(this)}
                onMouseLeave={handleHoverEnd.bind(this)}
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                {...props}
            >
                {count}
            </td>
        );
    }
}

class DatePicker extends React.Component {
    render() {
        let {
            onChange,
            value
        } = this.props;
        return (
            <DateRangePicker
                className="mb-3"
                calendarAriaLabel="Toggle calendar"
                clearAriaLabel="Clear value"
                clearIcon={null}
                dayAriaLabel="Day"
                format="dd.MM.y"
                monthAriaLabel="Month"
                nativeInputAriaLabel="Date"
                onChange={onChange}
                value={value}
                yearAriaLabel="Year"/>
        );
    }
}

const eventToCellLocation = (e) => {
    let target;
    // For touchmove and touchend events, e.target and e.touches[n].target are
    // wrong, so we have to rely on elementFromPoint(). For mouse clicks, we have
    // to use e.target.
    if(e.touches) {
        const touch = e.touches[0];
        target = document.elementFromPoint(touch.clientX, touch.clientY);
    } else {
        target = e.target;
        while(target.tagName !== 'TD') {
            target = target.parentNode;
        }
    }

    return {
        row: target.parentNode.rowIndex - 1,
        column: target.cellIndex - 1,
    };
};

/*eslint no-extend-native: ["error", { "exceptions": ["Date"] }]*/
Date.prototype.addDays = function(days) {
    let date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

function groupBy(key) {
    return function group(array) {
        return array.reduce((acc, obj) => {
            const property = obj[key];
            acc[property] = acc[property] || [];
            acc[property].push(obj);
            return acc;
        }, {});
    };
}