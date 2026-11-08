import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/notification.service';
import { applyServerErrors } from '../../core/problem-details';

export const DEMO_ACCOUNT = { email: 'demo@phonebook.local', password: 'Passw0rd!' } as const;

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <main class="auth">
      <div class="wrap">
        <span class="brand"><span class="mark"><mat-icon>contacts</mat-icon></span>PhoneBook</span>

        <form class="card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <h1>Sign in</h1>
          <p class="lead">Your contacts, numbers and groups — in one place.</p>

          <mat-form-field>
            <mat-label>E-mail</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="username" />
            @if (form.controls.email.hasError('server')) { <mat-error>{{ form.controls.email.getError('server') }}</mat-error> }
            @else if (form.controls.email.hasError('required')) { <mat-error>E-mail is required.</mat-error> }
            @else if (form.controls.email.hasError('email')) { <mat-error>Enter a valid e-mail.</mat-error> }
          </mat-form-field>

          <mat-form-field>
            <mat-label>Password</mat-label>
            <input matInput [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
            <button mat-icon-button matSuffix type="button" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.controls.password.hasError('server')) { <mat-error>{{ form.controls.password.getError('server') }}</mat-error> }
            @else if (form.controls.password.hasError('required')) { <mat-error>Password is required.</mat-error> }
          </mat-form-field>

          <button mat-flat-button class="submit" type="submit" [disabled]="loading()">
            @if (loading()) { <mat-spinner diameter="18" /> } @else { Sign in }
          </button>
        </form>

        <p class="alt">New to PhoneBook? <a routerLink="/register">Create an account</a></p>
        <p class="demo">
          Demo <code>{{ demo.email }}</code> <code>{{ demo.password }}</code>
          <button type="button" (click)="useDemo()">Use</button>
        </p>
      </div>
    </main>
  `,
  styleUrl: './auth-layout.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);

  readonly demo = DEMO_ACCOUNT;
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  readonly loading = signal(false);
  readonly showPassword = signal(false);

  useDemo(): void {
    this.form.setValue({ ...DEMO_ACCOUNT });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(returnUrl?.startsWith('/app') ? returnUrl : '/app');
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.form.controls.password.setErrors({ server: 'Incorrect e-mail or password.' });
          this.form.controls.password.markAsTouched();
          return;
        }
        const { handled } = applyServerErrors(this.form, err);
        if (!handled) this.notify.error(err);
      },
    });
  }
}
