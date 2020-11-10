const quickColumnConversions: Record<number, string> = {
  0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'H', 8: 'I', 9: 'J', 10: 'K', 11: 'L', 12: 'M', 13: 'N', 14: 'O', 15: 'P', 16: 'Q', 17: 'R',
  18: 'S', 19: 'T', 20: 'U', 21: 'V', 22: 'W', 23: 'X', 24: 'Y', 25: 'Z', 26: 'AA', 27: 'AB', 28: 'AC', 29: 'AD', 30: 'AE', 31: 'AF', 32: 'AG', 33: 'AH', 34: 'AI', 35: 'AJ', 36: 'AK', 37: 'AL', 38: 'AM', 39: 'AN', 40: 'AO', 41: 'AP', 42: 'AQ', 43: 'AR', 44: 'AS', 45: 'AT', 46: 'AU', 47: 'AV', 48: 'AW', 49:
    'AX', 50: 'AY', 51: 'AZ'
}

function convertToExcel(n: number): string {
  const ordA = 'A'.charCodeAt(0);
  const ordZ = 'Z'.charCodeAt(0);
  const len = ordZ - ordA + 1;

  let s = "";
  while (n >= 0) {
    s = String.fromCharCode(n % len + ordA) + s;
    n = Math.floor(n / len) - 1;
  }
  return s;
}

export function getColumnTitleFromIndex(index: number): string {
  // 0 -> A, 1-> B
  if (index in quickColumnConversions) {
    return quickColumnConversions[index]
  }
  return convertToExcel(index)
}


// yes, there is overlap between the functions above and the function below
// the function below seems to be 1-index based instead of 0-inex based.
// until I understand where it's used why I'm leaving it be for now

export function colIdx2colName(colIdx: number) {
  /**
   * Convert col index to col name.
   * 
   * @param {int}     colIdx (1, 2, 3, ...)
   * 
   * @return {String} colName (A, B, C, ...)
   */
  let dividend = Math.floor(Math.abs(colIdx)), rest, colName = '';
  while (dividend > 0) {
    rest = (dividend - 1) % 26;
    colName = String.fromCharCode(65 + rest) + colName;
    dividend = Math.floor((dividend - rest) / 26);
  }
  return colName;
}

export function colName2colIdx(colName: string) {
  /**
   * Convert col name to col index.
   * 
   * @param {String}  colName (A, B, C, ...)
   * 
   * @return {int}    colIdx (1, 2, 3, ...)
   */
  const chrs = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let colIdx = 0;
  for (let i = 0; i < colName.length; i++) {
    colIdx = colIdx * 26 + chrs.indexOf(colName[i]);
  }
  return colIdx;
}

export function getHueByRandom(total: number) {
  /**
   * Randomly generate different colors.
   * 
   * @param {int}     total total number of colors
   * 
   * @return {int}    hue, number in [0, 360)
   */
  const division = Math.floor(360 / total);
  return Math.floor(Math.random() * total) * division;
}

export function getHueByQnode(total: number, qnode: string) {
  /**
   * Use qnode as random seed to generate different colors.
   * 
   * @param {int}     total total number of colors
   * @param {String}  qnode
   * 
   * @return {int}    hue, number in [0, 360)
   */
  const i = parseInt(qnode.substring(1)) % total;
  const division = Math.floor(360 / total);
  return i * division;
}

export function isValidRegion(region: string) {
  /**
   * Check whether region (A1:B2) is valid.
   * 
   * @param {String}    region e.g. "A1:B2"
   * 
   * @return {boolean}  true if the region is valid
   */
  const [leftS, topS, rightS, bottomS] = region.match(/[a-z]+|\d+/gi)!; //eslint-disable-line
  const left = colName2colIdx(leftS);
  const right = colName2colIdx(rightS);
  const top = parseInt(topS);
  const bottom = parseInt(bottomS);
  return (left <= right) && (top <= bottom);
}

export function sortCells(cells: string[]) {
  /**
   * Sort cell array in col first order.
   * 
   * @param {Array}   cells e.g. [A1, B2, B1, A2]
   * 
   * @return {Array}  orderedCells e.g. [A1, A2, B1, B2]
   */
  const len = cells.length;
  const cellArray = new Array(len);
  for (let i = 0; i < len; i++) {
    const [colS, rowS] = cells[i].match(/[a-z]+|[^a-z]+/gi)!; // eslint-disable-line
    const col = colName2colIdx(colS);
    const row = parseInt(rowS);
    cellArray[i] = [col, row];
  }
  cellArray.sort(function (cell1, cell2) {
    if (cell1[0] !== cell2[0]) return cell1[0] - cell2[0];
    else return cell1[1] - cell2[1];
  });
  const orderedCells = new Array(len);
  for (let i = 0; i < len; i++) {
    const [col, row] = cellArray[i];
    orderedCells[i] = colIdx2colName(col) + row;
  }
  return orderedCells;
}

export function searchProject(title: string, keywords: string[]) {
  /**
   * Search if project title contains all given keywords
   * 
   * @param {String}  title     of project
   * @param {Array}   keywords  e.g. ["Hello", "World"]
   * 
   * @return {bool}
   */
  title = title.toLowerCase();
  for (let i = 0, len = keywords.length; i < len; i++) {
    if (title.indexOf(keywords[i]) === -1) {
      return false;
    }
  }
  return true;
}

export function timestamp2abstime(ts: number) {
  /**
   * Convert timestamp to absolute time
   * 
   * @param {int}     ts  as timestamp
   * 
   * @return {String} absolute time, e.g. Today, Yesterday, Previous 7 Days, Previous 30 Days, July, June, ...
   */
  const datetime = new Date();
  datetime.setTime(ts);
  const year = datetime.getFullYear();
  const month = datetime.getMonth() + 1;
  const date = datetime.getDate();
  const hour = datetime.getHours();
  const minute = datetime.getMinutes();
  const second = datetime.getSeconds();
  return (
    year + "-"
    + (month < 10 ? "0" + month : month) + "-"
    + (date < 10 ? "0" + date : date) + " "
    + (hour < 10 ? "0" + hour : hour) + ":"
    + (minute < 10 ? "0" + minute : minute) + ":"
    + (second < 10 ? "0" + second : second)
  );
}

export function timestamp2reltime(ts: number) {
  /**
   * Convert timestamp to relative time
   * 
   * @param {int}     ts  as timestamp
   * 
   * @return {String} relative time, e.g. Today, Yesterday, Previous 7 Days, Previous 30 Days, July, June, ...
   */
  const curr = new Date();
  const proj = new Date(ts);
  const interval = curr.getTime() - ts;
  const oneDay = 24 * 60 * 60 * 1000;
  if ((interval < oneDay) && (curr.getDate() === proj.getDate())) return "Today";
  if ((interval < 2 * oneDay) && (curr.getDate() === proj.getDate() + 1)) return "Yesterday";
  if (interval < 7 * oneDay) return "Previous 7 Days";
  if (interval < 30 * oneDay) return "Previous 30 Days";
  const months = ["January", "February", "Match", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (curr.getFullYear() === proj.getFullYear()) return months[proj.getMonth()];
  else return proj.getFullYear().toString();
}

export function isValidTitle(title: string) {
  /**
   * Check if title is valid:
   * 1. no more than 255 char
   * 2. not containing \ / : * ? " < > |
   * 3. not only spaces
   * 
   * @param {String}  title
   * 
   * @return {bool}   True if title is valid
   */
  if (title.length > 255) return false;
  return /^[^\\/:*?"<>|]*$/.test(title) && ! /^ +$/.test(title);
}
