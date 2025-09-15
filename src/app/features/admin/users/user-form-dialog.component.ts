import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from '@angular/forms';
import {
  UpsertUserDto,
  AdminUser,
} from '../../../../core/services/admin-users.service';
import { EDITOR_ID, ROLES, UNIDADES } from '../../../shared/data/catalogs';

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form-dialog.component.html',
  styleUrls: ['./user-form-dialog.component.css'],
})
export class UserFormDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() editing: AdminUser | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<{ id?: number; data: UpsertUserDto }>();

  readonly ROLES = ROLES;
  readonly UNIDADES = UNIDADES;
  readonly EDITOR_ID = EDITOR_ID;

  /** Build form in constructor to avoid "used before initialization". */
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido1: ['', [Validators.required, Validators.minLength(2)]],
      apellido2: [''],
      email: ['', [Validators.required, Validators.email]],
      rolId: [4, [Validators.required]],
      unidadId: [1, [Validators.required]],
      edit: [false],
      sign: [false],
    });
  }

  /** When role is Editor, show permission checkboxes */
  readonly isEditor = () => this.form.get('rolId')?.value === this.EDITOR_ID;

  ngOnChanges(): void {
    if (this.editing) {
      const e = this.editing;
      this.form.patchValue({
        nombre: e.nombre,
        apellido1: e.apellido1,
        apellido2: e.apellido2 || '',
        email: e.email,
        rolId: e.rolId,
        unidadId: e.unidadId,
        edit: e.editorPermissions?.includes('EDIT') || false,
        sign: e.editorPermissions?.includes('SIGN') || false,
      });
    } else {
      this.form.reset({
        nombre: '',
        apellido1: '',
        apellido2: '',
        email: '',
        rolId: 4,
        unidadId: 1,
        edit: false,
        sign: false,
      });
    }
  }

  backdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal'))
      this.close.emit();
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value as any;

    const editorPermissions =
      Number(v.rolId) === this.EDITOR_ID
        ? ([v.edit ? 'EDIT' : null, v.sign ? 'SIGN' : null].filter(Boolean) as (
            | 'EDIT'
            | 'SIGN'
          )[])
        : [];

    const dto: UpsertUserDto = {
      nombre: v.nombre,
      apellido1: v.apellido1,
      apellido2: v.apellido2 || '',
      email: v.email,
      rolId: Number(v.rolId), 
      unidadId: Number(v.unidadId), 
      editorPermissions,
    };

    this.submit.emit({ id: this.editing?.id ?? undefined, data: dto });
  }
}
