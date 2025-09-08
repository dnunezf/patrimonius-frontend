export interface NavItem {
  label: string;
  path: string;          // ruta interna o externa
  exact?: boolean;       // exact match para Inicio (/)
  external?: boolean;    // si es link externo (abre en nueva pestaña)
  iconSrc?: string;      // opcional: icono para el item
}
