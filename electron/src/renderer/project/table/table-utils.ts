import { AnnotationBlock } from '../../common/dtos';
import { CellSelection } from '../../common/general';
import wikiStore from '@/renderer/data/store';

export function columnToLetter(column: number) {
  column += 1;
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

export function letterToColumn(letter: String) {
  let column = 0;
  const length = letter.length;
  for (let i = 0; i < length; i++) {
    column += (letter.toUpperCase().charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }
  return column;
}

export function humanReadableSelection(selection: CellSelection) {
  const { x1, y1, x2, y2 } = selection;
  const y1_h = y1 + 1;
  const y2_h = y2 + 1;
  let text = '';
  if (x1 === x2 && y1_h === y2_h) {
    text += `${columnToLetter(x1)}${y1_h}`;
  } else {
    if (x1 <= x2) {
      text += `${columnToLetter(x1)}${y1_h <= y2_h ? y1_h : y2_h}`;
      text += `:${columnToLetter(x2)}${y1_h <= y2_h ? y2_h : y1_h}`;
    } else {
      text += ` ${columnToLetter(x2)}${y2_h <= y1_h ? y2_h : y1_h}`;
      text += `:${columnToLetter(x1)}${y2_h <= y1_h ? y1_h : y2_h}`;
    }
  }
  return text;
}

export function standardizeSelection(selection: CellSelection): CellSelection {
  let temp;
  if (selection.x2 < selection.x1) {
    temp = selection.x1;
    selection.x1 = selection.x2;
    selection.x2 = temp;
  }
  if (selection.y2 < selection.y1) {
    temp = selection.y1;
    selection.y1 = selection.y2;
    selection.y2 = temp;
  }
  return selection;
}

export function checkSelectedAnnotationBlocks(selection: CellSelection): AnnotationBlock | undefined {
  // checks if a given selection is part of an annotation block
  // if so, returns the annotation block
  selection = { x1: selection.x1 + 1, x2: selection.x2 + 1, y1: selection.y1 + 1, y2: selection.y2 + 1 } // todo index 0
  const { x1, x2, y1, y2 } = selection;
  for (const block of wikiStore.annotations.blocks) {
    if (block.selection['y1'] <= block.selection['y2']) {
      if (block.selection['x1'] <= block.selection['x2']) {
        if (x1 >= block.selection['x1'] &&
          x2 <= block.selection['x2'] &&
          y1 >= block.selection['y1'] &&
          y2 <= block.selection['y2']) {
          const rblock = {// todo index 0
            ...block,
            selection: { x1: block.selection.x1 - 1, x2: block.selection.x2 - 1, y1: block.selection.y1 - 1, y2: block.selection.y2 - 1 }
          }
          return rblock;
        }
      } else {
        if (x1 <= block.selection['x1'] &&
          x2 >= block.selection['x2'] &&
          y1 >= block.selection['y1'] &&
          y2 <= block.selection['y2']) {
          const rblock = {  // todo index 0
            ...block,
            selection: { x1: block.selection.x1 - 1, x2: block.selection.x2 - 1, y1: block.selection.y1 - 1, y2: block.selection.y2 - 1 }
          }
          return rblock;
        }
      }
    } else {
      if (block.selection['x1'] <= block.selection['x2']) {
        if (x1 >= block.selection['x1'] &&
          x2 <= block.selection['x2'] &&
          y1 <= block.selection['y1'] &&
          y2 >= block.selection['y2']) {
          const rblock = {  // todo index 0
            ...block,
            selection: { x1: block.selection.x1 - 1, x2: block.selection.x2 - 1, y1: block.selection.y1 - 1, y2: block.selection.y2 - 1 }
          }
          return rblock;
        }
      } else {
        if (x1 <= block.selection['x1'] &&
          x2 >= block.selection['x2'] &&
          y1 <= block.selection['y1'] &&
          y2 >= block.selection['y2']) {
          const rblock = {  // todo index 0
            ...block,
            selection: { x1: block.selection.x1 - 1, x2: block.selection.x2 - 1, y1: block.selection.y1 - 1, y2: block.selection.y2 - 1 }
          }
          return rblock;
        }
      }
    }
  }
  return undefined;
}

function isLetter(char: string) {
  return char.length === 1 && char.toLowerCase().match(/[a-z]/i);
}

export function isValidLabel(label?: string) {
  if (!label || label.length === 0) { return false; }
  for (const char of label) {
    if (isLetter(char)) return true;
  }
  return false;
}
