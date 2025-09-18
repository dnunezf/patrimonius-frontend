import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  AfterViewInit,
  ViewChildren,
  QueryList,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
  AbstractControl,
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
export class UserFormDialogComponent implements OnChanges, AfterViewInit {
  @Input() open = false;
  @Input() editing: AdminUser | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<{ id?: number; data: UpsertUserDto }>();

  readonly ROLES = ROLES;
  readonly UNIDADES = UNIDADES;
  readonly EDITOR_ID = EDITOR_ID;

  // Expose size for the multi-select (keeps list compact)
  readonly rolesSize = Math.min(this.ROLES.length, 6);

  @ViewChildren('ctl') private inputs!: QueryList<
    ElementRef<HTMLInputElement | HTMLSelectElement>
  >;

  /** Build the reactive form with strong validators. */
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      nombre: [
        '',
        [Validators.required, Validators.minLength(2), this.noBlank],
      ],
      apellido1: [
        '',
        [Validators.required, Validators.minLength(2), this.noBlank],
      ],
      apellido2: [''],
      email: ['', [Validators.required, Validators.email]],
      // ✅ multi-role support
      rolIds: this.fb.control<number[]>([], [this.minArray(1)]),
      unidadId: [
        UNIDADES[0]?.id ?? 1,
        [Validators.required, this.positiveNumber],
      ],
      edit: [false],
      sign: [false],
    });
  }

  /** Custom: disallow only-whitespace strings. */
  private noBlank = (c: AbstractControl) =>
    String(c.value ?? '').trim().length ? null : { blank: true };

  /** Custom: ensure positive integer for selects. */
  private positiveNumber = (c: AbstractControl) => {
    const n = Number(c.value);
    return Number.isInteger(n) && n > 0 ? null : { number: true };
  };

  /** Custom: require at least N items in arrays. */
  private minArray = (n: number) => (c: AbstractControl) =>
    Array.isArray(c.value) && c.value.length >= n ? null : { minItems: true };

  /** Error UI helpers */
  showErr(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
  errMsg(ctrl: string): string {
    const c = this.form.get(ctrl);
    if (!c || !c.errors) return '';
    if (c.errors['required']) return 'Campo requerido';
    if (c.errors['minlength']) return 'Mínimo 2 caracteres';
    if (c.errors['email']) return 'Correo inválido';
    if (c.errors['blank']) return 'No puede estar vacío';
    if (c.errors['number']) return 'Seleccione un valor válido';
    if (c.errors['minItems']) return 'Seleccione al menos un rol';
    return 'Valor inválido';
  }

  /** Show editor toggles if EDITOR role is selected among roles. */
  isEditor(): boolean {
    const ids = (this.form.get('rolIds')?.value as number[]) || [];
    return ids.includes(this.EDITOR_ID);
  }

  ngOnChanges(): void {
    if (this.editing) {
      const e = this.editing;
      // When editing, we only know primary role (rolId); use it as the initial selection.
      this.form.reset({
        nombre: e.nombre ?? '',
        apellido1: e.apellido1 ?? '',
        apellido2: e.apellido2 ?? '',
        email: e.email ?? '',
        rolIds: [e.rolId], // seed selection with current primary role
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
        rolIds: [], // ✅ empty until user picks
        unidadId: UNIDADES[0]?.id ?? 1,
        edit: false,
        sign: false,
      });
    }
  }

  ngAfterViewInit(): void {}

  backdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal'))
      this.close.emit();
  }

  /** Validate, focus first invalid, and emit sanitized DTO. */
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const firstInvalidKey = Object.keys(this.form.controls).find(
        (k) => this.form.get(k)?.invalid
      );
      if (firstInvalidKey) {
        const el = this.inputs.find(
          (r) =>
            r.nativeElement.getAttribute('formcontrolname') === firstInvalidKey
        );
        el?.nativeElement.focus();
      }
      return;
    }

    const v = this.form.value as any;
    const selected: number[] = (v.rolIds || []).map((n: any) => Number(n));

    // Primary role = first selected (backend keeps it in Usuario.rol_id)
    const primary = selected[0];

    const editorPermissions = selected.includes(this.EDITOR_ID)
      ? ([v.edit ? 'EDIT' : null, v.sign ? 'SIGN' : null].filter(Boolean) as (
          | 'EDIT'
          | 'SIGN'
        )[])
      : [];

    const dto: UpsertUserDto = {
      nombre: String(v.nombre).trim(),
      apellido1: String(v.apellido1).trim(),
      apellido2: String(v.apellido2 || '').trim(),
      email: String(v.email).trim(),
      rolId: Number(primary),
      rolIds: selected,
      unidadId: Number(v.unidadId),
      editorPermissions,
    };

    this.submit.emit({ id: this.editing?.id ?? undefined, data: dto });
  }
}
