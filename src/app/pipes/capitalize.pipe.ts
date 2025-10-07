import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatState'
})
export class FormatStatePipe implements PipeTransform {

  transform(value: string): string {
    if (!value) return value;

    // Paso 1: normaliza el formato (quita guiones bajos, capitaliza)
    const formatted = value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());

    // Paso 2: aplica equivalencias o tildes específicas al español
    switch (formatted) {
      case 'Edicion':
        return 'Edición';
      case 'Creacion':
        return 'Creación';
      case 'Firma Parcial':
        return 'Firma Parcial';
      case 'Firma Completa':
        return 'Firma Completa';
      default:
        return formatted;
    }
  }
}
