export function columnToLetter(column: number) {
  let temp, letter = '';
  while ( column > 0 ) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

export function letterToColumn(letter: String) {
  const column = 0, length = letter.length;
  for ( let i = 0; i < length; i++ ) {
    column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }
  return column;
}

export function humanReadableSelection(selection) {
  const { x1, y1, x2, y2 } = selection;
  let text = '';
  if ( x1 === x2 && y1 === y2 ) {
    text += `${columnToLetter(x1)}${y1}`;
  } else {
    if ( x1 <= x2 ) {
      text += `${columnToLetter(x1)}${y1 <= y2 ? y1 : y2}`;
      text += `:${columnToLetter(x2)}${y1 <= y2 ? y2 : y1}`;
    } else {
      text += ` ${columnToLetter(x2)}${y2 <= y1 ? y2 : y1}`;
      text += `:${columnToLetter(x1)}${y2 <= y1 ? y1 : y2}`;
    }
  }
  return text;
}
