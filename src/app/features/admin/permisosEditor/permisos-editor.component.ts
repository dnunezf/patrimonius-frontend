import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-permisos-editor',
  templateUrl: './permisos-editor.component.html',
  imports: [
    FormsModule
  ],
  styleUrls: ['./permisos-editor.component.css']
})
export class PermisosEditorComponent {
  // Lógica de gestión de permisos del Editor (editar y firmar)
  editPermission = false;
  signPermission = false;

  // Método para asignar permisos
  assignPermissions() {
    // Lógica para asignar permisos (puedes conectarlo al backend más tarde)
    console.log('Permisos asignados:', {
      edit: this.editPermission,
      sign: this.signPermission
    });
  }
}
