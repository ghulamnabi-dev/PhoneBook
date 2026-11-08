import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/notification.service';
import { applyServerErrors, problemMessage } from '../../core/problem-details';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <main class="auth">
      <div class="wrap">
        <span class="brand"><span class="mark"><mat-icon>contacts</mat-icon></span>PhoneBook</span>

        <form class="card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <h1>Create your account</h1>
          <p class="lead">You'll be signed in straight away.</p>

          <mat-form-field>
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" autocomplete="name" />
            @if (form.controls.name.hasError('server')) { <mat-error>{{ form.controls.name.getError('server') }}</mat-error> }
            @else if (form.controls.name.hasError('required')) { <mat-error>Name is required.</mat-error> }
          </mat-form-field>

          <mat-form-field>
            <mat-label>E-mail</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            @if (form.controls.email.hasError('server')) { <mat-error>{{ form.controls.email.getError('server') }}</mat-error> }
            @else if (form.controls.email.hasError('required')) { <mat-error>E-mail is required.</mat-error> }
            @else if (form.controls.email.hasError('email')) { <mat-error>Enter a valid e-mail.</mat-error> }
          </mat-form-field>

          <mat-form-field>
            <mat-label>Password</mat-label>
            <input matInput [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="new-password" />
            <button mat-icon-button matSuffix type="button" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-hint>At least 8 characters.</mat-hint>
            @if (form.controls.password.hasError('server')) { <mat-error>{{ form.controls.password.getError('server') }}</mat-error> }
            @else if (form.controls.password.hasError('required')) { <mat-error>Password is required.</mat-error> }
            @else if (form.controls.password.hasError('minlength')) { <mat-error>Use at least 8 characters.</mat-error> }
          </mat-form-field>

          <button mat-flat-button class="submit" type="submit" [disabled]="loading()">
            @if (loading()) { <mat-spinner diameter="18" /> } @else { Create account }
          </button>
        </form>

        <p class="alt">Already have an account? <a routerLink="/login">Sign in</a></p>
      </div>
    </main>
  `,
  styleUrl: './auth-layout.scss',
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
  });
  readonly loading = signal(false);
  readonly showPassword = signal(false);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.notify.success('Account created. Welcome to PhoneBook.');
        void this.router.navigateByUrl('/app');
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 409) {
          // Duplicate e-mail: the message belongs on the e-mail field, not in a toast.
          this.form.controls.email.setErrors({ server: problemMessage(err) ?? 'That e-mail is already registered.' });
          this.form.controls.email.markAsTouched();
          return;
        }
        const { handled, unmapped } = applyServerErrors(this.form, err);
        if (!handled) this.notify.error(err);
        else if (unmapped.length) this.notify.error(unmapped[0]);
      },
    });
  }
}
