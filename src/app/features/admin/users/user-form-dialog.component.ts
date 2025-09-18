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

/**
 * User Form Dialog
 * - Multi-role selection with checkbox chips.
 * - Template-safe event handling (no $event.target.checked in template).
 */
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

  @ViewChildren('ctl') private inputs!: QueryList<
    ElementRef<HTMLInputElement | HTMLSelectElement>
  >;

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
      rolIds: [[], [Validators.required, this.minOne]],
      unidadId: [
        UNIDADES[0]?.id ?? 1,
        [Validators.required, this.positiveNumber],
      ],
      edit: [false],
      sign: [false],
    });
  }

  // Validators
  private noBlank = (c: AbstractControl) =>
    String(c.value ?? '').trim().length ? null : { blank: true };

  private positiveNumber = (c: AbstractControl) => {
    const n = Number(c.value);
    return Number.isInteger(n) && n > 0 ? null : { number: true };
  };

  private minOne = (c: AbstractControl) =>
    Array.isArray(c.value) && c.value.length > 0 ? null : { minOne: true };

  // UI helpers
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
    if (c.errors['minOne']) return 'Seleccione al menos un rol';
    return 'Valor inválido';
  }

  isEditor(): boolean {
    return this.getRolIds().includes(this.EDITOR_ID);
  }

  private getRolIds(): number[] {
    const raw = (this.form.get('rolIds')?.value as (string | number)[]) || [];
    return raw.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  }

  hasRole(id: number): boolean {
    return this.getRolIds().includes(id);
  }

  /** Safe handler: derives `checked` from Event, avoids template casts. */
  onRoleToggle(id: number, ev: Event): void {
    const checked = (ev.target as HTMLInputElement | null)?.checked ?? false;
    const set = new Set(this.getRolIds());
    if (checked) set.add(id);
    else set.delete(id);
    this.form.get('rolIds')?.setValue(Array.from(set));
    this.form.get('rolIds')?.markAsDirty();
    this.form.get('rolIds')?.markAsTouched();

    if (!this.isEditor()) {
      this.form.patchValue({ edit: false, sign: false }, { emitEvent: false });
    }
  }

  selectAllRoles(): void {
    this.form.get('rolIds')?.setValue(this.ROLES.map((r) => r.id));
    this.form.get('rolIds')?.markAsDirty();
  }

  clearAllRoles(): void {
    this.form.get('rolIds')?.setValue([]);
    this.form.get('rolIds')?.markAsDirty();
    this.form.patchValue({ edit: false, sign: false }, { emitEvent: false });
  }

  // Lifecycle
  ngOnChanges(): void {
    if (this.editing) {
      const e = this.editing;
      const ids = (e as any).rolIds?.length
        ? (e as any).rolIds.map(Number)
        : [e.rolId];
      this.form.reset({
        nombre: e.nombre ?? '',
        apellido1: e.apellido1 ?? '',
        apellido2: e.apellido2 ?? '',
        email: e.email ?? '',
        rolIds: ids,
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
        rolIds: [this.ROLES[0]?.id ?? 1],
        unidadId: this.UNIDADES[0]?.id ?? 1,
        edit: false,
        sign: false,
      });
    }
  }

  ngAfterViewInit(): void {}

  backdrop(e: MouseEvent) {
    if ((e.target as HTMLElement | null)?.classList.contains('modal'))
      this.close.emit();
  }

  // Submit
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
    const rolIds: number[] = (v.rolIds || [])
      .map((n: any) => Number(n))
      .filter((n: number) => Number.isInteger(n) && n > 0);
    const rolId = rolIds[0];
    const editorPermissions = rolIds.includes(this.EDITOR_ID)
      ? ([v.edit ? 'EDIT' : null, v.sign ? 'SIGN' : null].filter(Boolean) as (
          | 'EDIT'
          | 'SIGN'
        )[])
      : [];

    const dto = {
      nombre: String(v.nombre).trim(),
      apellido1: String(v.apellido1).trim(),
      apellido2: String(v.apellido2 || '').trim(),
      email: String(v.email).trim(),
      rolId,
      rolIds,
      unidadId: Number(v.unidadId),
      editorPermissions,
    } as UpsertUserDto & { rolIds: number[] };

    this.submit.emit({ id: this.editing?.id ?? undefined, data: dto });
  }

  trackByRole(index: number, r: { id: number; label: string }): number {
    return r.id;
  }

  trackByUnidad(index: number, u: { id: number; label: string }): number {
    return u.id;
  }
}
