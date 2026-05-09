import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  Router,
} from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

type RoleActor = {
  rolId?: number;
  rol_id?: number;
  rolIds?: unknown;
  rol_ids?: unknown;
  isMaster?: boolean;
} | null;

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowedRoles: number[] = route.data['allowedRoles'] ?? [];
    const user = this.auth.currentUser();
    const actor = user as RoleActor | undefined;
    const rolId = Number(actor?.rolId ?? actor?.rol_id ?? 0);
    const isMaster = user?.isMaster === true;

    const extra = actor?.rolIds ?? actor?.rol_ids;
    const rolIdsFromArray = Array.isArray(extra)
      ? extra
          .map((x) => Number(x))
          .filter((n) => Number.isFinite(n))
      : [];

    const matchesPrimary =
      Number.isFinite(rolId) && rolId !== 0 && allowedRoles.includes(rolId);
    const matchesAnySecondary = rolIdsFromArray.some((id) =>
      allowedRoles.includes(id)
    );

    if (isMaster || matchesPrimary || matchesAnySecondary) {
      return true;
    }
    this.router.navigate(['/']);
    return false;
  }
}
