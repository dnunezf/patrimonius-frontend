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

  /** Grab references to inputs so we can focus the first invalid on submit. */
  @ViewChildren('ctl') private inputs!: QueryList<
    ElementRef<HTMLInputElement | HTMLSelectElement>
  >;

  /** Build the reactive form with strong validators. */
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      // required + min length + not-only-spaces
      nombre: [
        '',
        [Validators.required, Validators.minLength(2), this.noBlank],
      ],
      apellido1: [
        '',
        [Validators.required, Validators.minLength(2), this.noBlank],
      ],
      apellido2: [''],
      // required + email format
      email: ['', [Validators.required, Validators.email]],
      // selects must be positive integers
      rolId: [ROLES[0]?.id ?? 1, [Validators.required, this.positiveNumber]],
      unidadId: [
        UNIDADES[0]?.id ?? 1,
        [Validators.required, this.positiveNumber],
      ],
      // editor toggles
      edit: [false],
      sign: [false],
    });
  }

  /** Disallow strings containing only whitespace. */
  private noBlank = (c: AbstractControl) =>
    String(c.value ?? '').trim().length ? null : { blank: true };

  /** Ensure value is a positive integer (for select controls). */
  private positiveNumber = (c: AbstractControl) => {
    const n = Number(c.value);
    return Number.isInteger(n) && n > 0 ? null : { number: true };
  };

  /** Helper to decide when to show an error message. */
  showErr(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  /** Human-readable error message per control. */
  errMsg(ctrl: string): string {
    const c = this.form.get(ctrl);
    if (!c || !c.errors) return '';
    if (c.errors['required']) return 'Campo requerido';
    if (c.errors['minlength']) return 'Mínimo 2 caracteres';
    if (c.errors['email']) return 'Correo inválido';
    if (c.errors['blank']) return 'No puede estar vacío';
    if (c.errors['number']) return 'Seleccione un valor válido';
    return 'Valor inválido';
  }

  /** Show editor switches when role is EDITOR_ID. */
  isEditor(): boolean {
    return Number(this.form.get('rolId')?.value) === this.EDITOR_ID;
  }

  ngOnChanges(): void {
    // Reset or patch the form when dialog is opened for create/edit
    if (this.editing) {
      const e = this.editing;
      this.form.reset({
        nombre: e.nombre ?? '',
        apellido1: e.apellido1 ?? '',
        apellido2: e.apellido2 ?? '',
        email: e.email ?? '',
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
        rolId: ROLES[0]?.id ?? 1,
        unidadId: UNIDADES[0]?.id ?? 1,
        edit: false,
        sign: false,
      });
    }
  }

  ngAfterViewInit(): void {}

  /** Close dialog when clicking on the backdrop only. */
  backdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal'))
      this.close.emit();
  }

  /** Validate, focus first invalid, and emit a sanitized DTO. */
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      // Focus first invalid control to guide the user
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
    const editorPermissions =
      Number(v.rolId) === this.EDITOR_ID
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
      rolId: Number(v.rolId),
      unidadId: Number(v.unidadId),
      editorPermissions,
    };

    this.submit.emit({ id: this.editing?.id ?? undefined, data: dto });
  }
}
