import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-catalogo-roles',
  templateUrl: './catalogo-roles.component.html',
  imports: [
    FormsModule
  ],
  styleUrls: ['./catalogo-roles.component.css']
})
export class CatalogoRolesComponent implements OnInit {
  roles: any[] = []; // Lista de roles
  newRole: any = {}; // Para crear un nuevo rol

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadRoles(); // Cargar los roles al inicio
  }

  // Cargar roles desde el backend
  loadRoles(): void {
    this.http.get<any[]>('/api/admin/roles').subscribe((data) => {
      this.roles = data; // Asignar los roles obtenidos
    });
  }

  // Crear un nuevo rol
  createRole(): void {
    if (!this.newRole.nombre) {
      alert('El nombre del rol es obligatorio');
      return;
    }

    this.http.post('/api/admin/roles', this.newRole).subscribe(
      (response) => {
        this.roles.push(response); // Agregar el nuevo rol a la lista
        this.newRole = {}; // Limpiar el formulario
      },
      (error) => {
        alert('Hubo un error al crear el rol');
        console.error(error);
      }
    );
  }

  // Editar un rol existente
  editRole(role: any): void {
    const updatedRole = prompt('Nuevo nombre para el rol', role.nombre);
    if (updatedRole && updatedRole !== role.nombre) {
      const updatedData = { ...role, nombre: updatedRole };

      this.http.patch(`/api/admin/roles/${role.id}`, updatedData).subscribe(
        (response) => {
          role.nombre = updatedRole; // Actualizar el nombre del rol en la lista
        },
        (error) => {
          alert('Hubo un error al actualizar el rol');
          console.error(error);
        }
      );
    }
  }

  // Eliminar un rol
  deleteRole(roleId: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este rol?')) {
      this.http.delete(`/api/admin/roles/${roleId}`).subscribe(
        () => {
          this.roles = this.roles.filter((role) => role.id !== roleId); // Eliminar el rol de la lista
        },
        (error) => {
          alert('Hubo un error al eliminar el rol');
          console.error(error);
        }
      );
    }
  }
}
