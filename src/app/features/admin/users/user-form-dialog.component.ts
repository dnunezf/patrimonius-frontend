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
import { UpsertUserDto, AdminUser } from '../../../../core/services/admin-users.service';
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

  /** Static catalogs exposed to the template. */
  readonly ROLES = ROLES;
  readonly UNIDADES = UNIDADES;
  readonly EDITOR_ID = EDITOR_ID;

  /** Visual tweak: how many rows to show in the multi-select. */
  readonly rolesSize = Math.min(this.ROLES.length, 6);

  /** Grab references to inputs to focus the first invalid on submit. */
  @ViewChildren('ctl') private inputs!: QueryList<ElementRef<HTMLInputElement | HTMLSelectElement>>;

  /** Reactive form. */
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    // Build form with strong validation rules
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), this.noBlank]],
      apellido1: ['', [Validators.required, Validators.minLength(2), this.noBlank]],
      apellido2: [''],
      email: ['', [Validators.required, Validators.email]],

      // Multiple roles: user must select at least one
      rolIds: [[], [Validators.required, this.minOne]],

      // Must be a positive number (catalog id)
      unidadId: [UNIDADES[0]?.id ?? 1, [Validators.required, this.positiveNumber]],

      // Editor-specific toggles (only used if EDITOR is among roles)
      edit: [false],
      sign: [false],
    });
  }

  // ── Custom validators (kept as arrow functions to preserve `this`) ──────────
  /** Disallow strings with only whitespace. */
  private noBlank = (c: AbstractControl) =>
    String(c.value ?? '').trim().length ? null : { blank: true };

  /** Ensure numeric positive values (used by selects). */
  private positiveNumber = (c: AbstractControl) => {
    const n = Number(c.value);
    return Number.isInteger(n) && n > 0 ? null : { number: true };
  };

  /** At least one item must be selected in the multi-select. */
  private minOne = (c: AbstractControl) =>
    Array.isArray(c.value) && c.value.length > 0 ? null : { minOne: true };

  // ── UI helpers ──────────────────────────────────────────────────────────────
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

  /** True if any selected role is the EDITOR role. */
  isEditor(): boolean {
    const ids = (this.form.get('rolIds')?.value as (string | number)[]) || [];
    return ids.map(Number).includes(this.EDITOR_ID);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  ngOnChanges(): void {
    // When editing, patch existing values including the multi-role list
    if (this.editing) {
      const e = this.editing;
      const ids = (e as any).rolIds?.length ? (e as any).rolIds.map(Number) : [e.rolId];
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
      // Defaults for create
      this.form.reset({
        nombre: '',
        apellido1: '',
        apellido2: '',
        email: '',
        rolIds: [ROLES[0]?.id ?? 1],
        unidadId: UNIDADES[0]?.id ?? 1,
        edit: false,
        sign: false,
      });
    }
  }

  ngAfterViewInit(): void {}

  /** Close the dialog if the click originates from the backdrop. */
  backdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal')) this.close.emit();
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  /** Validate, focus the first invalid control, and emit a sanitized DTO. */
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      // Focus the first invalid control to guide the user
      const firstInvalidKey = Object.keys(this.form.controls).find(k => this.form.get(k)?.invalid);
      if (firstInvalidKey) {
        const el = this.inputs.find(r => r.nativeElement.getAttribute('formcontrolname') === firstInvalidKey);
        el?.nativeElement.focus();
      }
      return;
    }

    const v = this.form.value as any;

    // Native <select multiple> returns string[]; coerce to number[]
    const rolIds: number[] = (v.rolIds || [])
      .map((n: any) => Number(n))
      .filter((n: number) => Number.isInteger(n) && n > 0);

    // Primary role = first of the list (server still stores a primary in Usuario.rol_id)
    const rolId = rolIds[0];

    // Only send editor permissions if the EDITOR role is selected
    const editorPermissions =
      rolIds.includes(this.EDITOR_ID)
        ? ([v.edit ? 'EDIT' : null, v.sign ? 'SIGN' : null].filter(Boolean) as ('EDIT' | 'SIGN')[])
        : [];

    // NOTE: UpsertUserDto on the frontend should include `rolIds: number[]`
    // to match the backend create/update schemas (primary + all roles).
    const dto = {
      nombre: String(v.nombre).trim(),
      apellido1: String(v.apellido1).trim(),
      apellido2: String(v.apellido2 || '').trim(),
      email: String(v.email).trim(),
      rolId,
      rolIds,          // <-- multiple roles
      unidadId: Number(v.unidadId),
      editorPermissions,
    } as UpsertUserDto & { rolIds: number[] };

    this.submit.emit({ id: this.editing?.id ?? undefined, data: dto });
  }
}
