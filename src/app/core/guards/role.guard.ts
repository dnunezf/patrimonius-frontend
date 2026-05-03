import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  Router,
} from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowedRoles: number[] = route.data['allowedRoles'] ?? [];
    const user = this.auth.currentUser();
    const actor = user as
      | { rolId?: number; rol_id?: number; isMaster?: boolean }
      | null
      | undefined;
    const rolId = Number(actor?.rolId ?? actor?.rol_id ?? 0);
    const isMaster = user?.isMaster === true;

    if (isMaster || allowedRoles.includes(rolId)) {
      return true;
    }
    this.router.navigate(['/logs/queries']);
    return false;
  }
}
