import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
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
import {
  UnidadService,
  OrgUnit,
} from '../../../../core/services/unidad.service';
import { EDITOR_ID, ROLES } from '../../../shared/data/catalogs';

/**
 * User Form Dialog
 * - Fetches organizational units from backend to avoid mismatched IDs.
 * - Supports multi-role selection with checkbox chips.
 * - Editor permissions (EDIT/SIGN) are enabled only when EDITOR role is selected.
 * - Upload permission (HU-21) is enabled only when EDITOR or ARCHIVISTA role is selected.
 * - Exposes `isSubmitting` to lock the submit button while parent handles the request.
 */
@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form-dialog.component.html',
  styleUrls: ['./user-form-dialog.component.css'],
})
export class UserFormDialogComponent
  implements OnInit, OnChanges, AfterViewInit
{
  @Input() open = false;
  @Input() editing: AdminUser | null = null;

  @Input() submitting = false;

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<{
    id?: number;
    data: UpsertUserDto & {
      rolIds: number[];
      editorPermissions?: ('EDIT' | 'SIGN')[];
      canUpload?: boolean; // ✅ NUEVO
    };
  }>();

  /** Static roles catalog (labels and ids) */
  readonly ROLES = ROLES;

  /** Role ID that gates editor permissions UI */
  readonly EDITOR_ID = EDITOR_ID;

  /** ⚠️ Ajustá si tu ARCHIVISTA no es 3 */
  readonly ARCHIVISTA_ID = 3;

  /** Units loaded from backend */
  units: OrgUnit[] = [];
  unitsLoading = false;

  /** Locks the submit button and can drive a loading indicator */
  isSubmitting = false;

  /** Refs for focusing first invalid field */
  @ViewChildren('ctl') private inputs!: QueryList<
    ElementRef<HTMLInputElement | HTMLSelectElement>
  >;

  /** Reactive form */
  form: FormGroup;

  private static readonly MAX_NAME = 100;
  private static readonly MAX_EMAIL = 255;

  constructor(private fb: FormBuilder, private unitsApi: UnidadService) {
    this.form = this.fb.group({
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(UserFormDialogComponent.MAX_NAME),
          this.noBlank,
          this.onlyLetters,
        ],
      ],
      apellido1: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(UserFormDialogComponent.MAX_NAME),
          this.noBlank,
          this.onlyLetters,
        ],
      ],
      apellido2: [
        '',
        [
          Validators.maxLength(UserFormDialogComponent.MAX_NAME),
          this.onlyLetters,
        ],
      ],
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(UserFormDialogComponent.MAX_EMAIL),
        ],
      ],
      rolIds: [[], [Validators.required, this.minOne]],
      // Unit is set after units load; keep null to avoid defaulting to wrong IDs
      unidadId: [null, [Validators.required, this.positiveNumber]],
      // Editor permissions toggles
      edit: [false],
      sign: [false],

      // ✅ NUEVO: Permiso global para cargar documentos (HU-21)
      canUpload: [false],
    });
  }

  // ---------- Validators ----------

  /** Rejects strings that are only whitespace */
  private noBlank = (c: AbstractControl) =>
    String(c.value ?? '').trim().length ? null : { blank: true };

  /** Solo letras, espacios, guiones y apóstrofes (sin números) */
  private onlyLetters = (c: AbstractControl) => {
    const v = String(c.value ?? '').trim();
    if (!v) return null;
    const onlyLettersAndSpaces = /^[\p{L}\s\-']+$/u.test(v);
    return onlyLettersAndSpaces ? null : { onlyLetters: true };
  };

  /** Requires a positive integer */
  private positiveNumber = (c: AbstractControl) => {
    const n = Number(c.value);
    return Number.isInteger(n) && n > 0 ? null : { number: true };
  };

  /** Requires at least one selected role */
  private minOne = (c: AbstractControl) =>
    Array.isArray(c.value) && c.value.length > 0 ? null : { minOne: true };

  // ---------- UI helpers ----------

  showErr(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  /** Mensajes de error para el usuario */
  errMsg(ctrl: string): string {
    const c = this.form.get(ctrl);
    if (!c || !c.errors) return '';
    if (c.errors['required']) return 'Este campo es obligatorio';
    if (c.errors['minlength']) return 'Mínimo 2 caracteres';
    if (c.errors['maxlength'])
      return ctrl === 'email'
        ? `Máximo ${UserFormDialogComponent.MAX_EMAIL} caracteres`
        : `Máximo ${UserFormDialogComponent.MAX_NAME} caracteres`;
    if (c.errors['email']) return 'Correo electrónico no válido';
    if (c.errors['blank']) return 'No puede quedar en blanco';
    if (c.errors['number']) return 'Seleccione una opción válida';
    if (c.errors['minOne']) return 'Seleccione al menos un rol';
    if (c.errors['onlyLetters']) return 'Solo se permiten letras (sin números)';
    return 'Valor no válido';
  }

  /** True when EDITOR role is selected */
  isEditor(): boolean {
    return this.getRolIds().includes(this.EDITOR_ID);
  }

  /** True when EDITOR or ARCHIVISTA role is selected */
  isEditorOrArchivista(): boolean {
    const ids = this.getRolIds();
    return ids.includes(this.EDITOR_ID) || ids.includes(this.ARCHIVISTA_ID);
  }

  /** Normalized role IDs from form state */
  private getRolIds(): number[] {
    const raw = (this.form.get('rolIds')?.value as (string | number)[]) || [];
    return raw.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  }

  /** Checkbox chip toggle handler for roles */
  onRoleToggle(id: number, ev: Event): void {
    const checked = (ev.target as HTMLInputElement | null)?.checked ?? false;
    const set = new Set(this.getRolIds());
    if (checked) set.add(id);
    else set.delete(id);

    this.form.get('rolIds')?.setValue(Array.from(set));
    this.form.get('rolIds')?.markAsDirty();
    this.form.get('rolIds')?.markAsTouched();

    // Keep perms consistent with role selection
    this.ensurePermsConsistency();
  }

  /** Select all roles quickly */
  selectAllRoles(): void {
    this.form.get('rolIds')?.setValue(this.ROLES.map((r) => r.id));
    this.form.get('rolIds')?.markAsDirty();
    this.ensurePermsConsistency();
  }

  /** Clear all roles and disable perms */
  clearAllRoles(): void {
    this.form.get('rolIds')?.setValue([]);
    this.form.get('rolIds')?.markAsDirty();
    this.ensurePermsConsistency();
  }

  /** Keeps editor perms and upload perm consistent with role selection */
  private ensurePermsConsistency(): void {
    // If EDITOR role is not present, turn off edit/sign toggles
    if (!this.isEditor()) {
      this.form.patchValue({ edit: false, sign: false }, { emitEvent: false });
    }

    // If not Editor/Archivista, disable upload
    if (!this.isEditorOrArchivista()) {
      this.form.patchValue({ canUpload: false }, { emitEvent: false });
    }
  }

  /** Returns true if the given role id is currently selected in the form. */
  hasRole(id: number): boolean {
    return this.getRolIds().includes(Number(id));
  }

  // ---------- Lifecycle ----------

  ngOnInit(): void {
    this.loadUnits();
  }

  /** Load units from backend and set a safe default in create mode */
  private loadUnits(): void {
    this.unitsLoading = true;
    this.unitsApi.list().subscribe({
      next: (list) => {
        this.units = list || [];
        const current = this.form.get('unidadId')?.value;
        // If creating and unit not set yet, pick the first available
        if (
          !this.editing &&
          (current == null || current === 0) &&
          this.units.length
        ) {
          this.form.get('unidadId')?.setValue(this.units[0].id);
        }
      },
      error: () => {
        this.units = [];
      },
      complete: () => {
        this.unitsLoading = false;
      },
    });
  }

  /** Refill form on edit/create transitions */
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
        unidadId: e.unidadId ?? null,
        edit: e.editorPermissions?.includes('EDIT') || false,
        sign: e.editorPermissions?.includes('SIGN') || false,

        // ✅ NUEVO
        canUpload: (e as any).canUpload || false,
      });

      this.ensurePermsConsistency();
    } else {
      // Create mode defaults
      this.form.reset({
        nombre: '',
        apellido1: '',
        apellido2: '',
        email: '',
        rolIds: [this.ROLES[0]?.id ?? 1],
        unidadId: this.units.length ? this.units[0].id : null,
        edit: false,
        sign: false,

        // ✅ NUEVO
        canUpload: false,
      });

      this.ensurePermsConsistency();
    }
  }

  get disableSubmit(): boolean {
    return this.form.invalid || this.submitting;
  }

  get loading(): boolean {
    return this.submitting;
  }

  ngAfterViewInit(): void {}

  backdrop(e: MouseEvent) {
    if ((e.target as HTMLElement | null)?.classList.contains('modal'))
      this.onCancel();
  }

  onCancel(): void {
    this.close.emit();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const firstInvalidKey = Object.keys(this.form.controls).find(
        (k) => this.form.get(k)?.invalid
      );
      const el = firstInvalidKey
        ? this.inputs.find(
          (r) =>
            r.nativeElement.getAttribute('formcontrolname') ===
            firstInvalidKey
        )
        : null;
      el?.nativeElement.focus();
      return;
    }

    const v = this.form.value as any;
    const rolIds = (v.rolIds as (number | string)[])
      .map((n: number | string) => Number(n))
      .filter((n: number) => Number.isInteger(n) && n > 0);

    const dto: UpsertUserDto & {
      rolIds: number[];
      editorPermissions?: ('EDIT' | 'SIGN')[];
      canUpload?: boolean;
    } = {
      nombre: String(v.nombre).trim(),
      apellido1: String(v.apellido1).trim(),
      apellido2: String(v.apellido2 || '').trim(),
      email: String(v.email).trim(),
      rolId: rolIds[0],
      rolIds,
      unidadId: Number(v.unidadId),

      editorPermissions: rolIds.includes(this.EDITOR_ID)
        ? ([v.edit ? 'EDIT' : null, v.sign ? 'SIGN' : null].filter(Boolean) as (
          | 'EDIT'
          | 'SIGN'
          )[])
        : [],

      // ✅ NUEVO: solo permitido si Editor/Archivista
      canUpload: this.isEditorOrArchivista() ? !!v.canUpload : false,
    };

    this.submit.emit({ id: this.editing?.id ?? undefined, data: dto });
  }

  // ---------- trackBy ----------

  trackByRole(index: number, r: { id: number; label: string }): number {
    return r.id;
  }

  trackByUnidad(index: number, u: OrgUnit): number {
    return u.id;
  }
}
