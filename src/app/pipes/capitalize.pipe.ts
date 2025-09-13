import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatState'
})
export class FormatStatePipe implements PipeTransform {

  transform(value: string): string {
    if (!value) return value;

    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
