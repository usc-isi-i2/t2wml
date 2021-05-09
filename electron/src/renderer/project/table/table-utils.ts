import { AnnotationBlock } from '../../common/dtos';
import { CellSelection } from '../../common/general';
import wikiStore from '@/renderer/data/store';

export function columnToLetter(column: number) {
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
    column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }
  return column;
}

export function humanReadableSelection(selection: CellSelection) {
  const { x1, y1, x2, y2 } = selection;
  let text = '';
  if (x1 === x2 && y1 === y2) {
    text += `${columnToLetter(x1)}${y1}`;
  } else {
    if (x1 <= x2) {
      text += `${columnToLetter(x1)}${y1 <= y2 ? y1 : y2}`;
      text += `:${columnToLetter(x2)}${y1 <= y2 ? y2 : y1}`;
    } else {
      text += ` ${columnToLetter(x2)}${y2 <= y1 ? y2 : y1}`;
      text += `:${columnToLetter(x1)}${y2 <= y1 ? y1 : y2}`;
    }
  }
  return text;
}

export function standardizeSelection(selection: CellSelection): CellSelection {
  let temp;
  if ( selection.x2 < selection.x1 ) {
    temp = selection.x1;
    selection.x1 = selection.x2;
    selection.x2 = temp;
  }
  if ( selection.y2 < selection.y1 ) {
    temp = selection.y1;
    selection.y1 = selection.y2;
    selection.y2 = temp;
  }
  return selection;
}

export function checkSelectedAnnotationBlocks(selection: CellSelection): AnnotationBlock | undefined {
  // checks if a given selection is part of an annotation block
  // if so, returns the annotation block
  const { x1, x2, y1, y2 } = selection;
  for (const block of wikiStore.annotations.blocks) {
    if (block.selection['y1'] <= block.selection['y2']) {
      if (block.selection['x1'] <= block.selection['x2']) {
        if (x1 >= block.selection['x1'] &&
          x2 <= block.selection['x2'] &&
          y1 >= block.selection['y1'] &&
          y2 <= block.selection['y2']) {
          return block;
        }
      } else {
        if (x1 <= block.selection['x1'] &&
          x2 >= block.selection['x2'] &&
          y1 >= block.selection['y1'] &&
          y2 <= block.selection['y2']) {
          return block;
        }
      }
    } else {
      if (block.selection['x1'] <= block.selection['x2']) {
        if (x1 >= block.selection['x1'] &&
          x2 <= block.selection['x2'] &&
          y1 <= block.selection['y1'] &&
          y2 >= block.selection['y2']) {
          return block;
        }
      } else {
        if (x1 <= block.selection['x1'] &&
          x2 >= block.selection['x2'] &&
          y1 <= block.selection['y1'] &&
          y2 >= block.selection['y2']) {
          return block;
        }
      }
    }
  }
  return;
}
