import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { avatarHue, initials } from './avatar';

/** Initials on a muted, deterministic hue. Decorative: the name is always rendered next to it. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'avatar',
    'aria-hidden': 'true',
    '[style.--h]': 'hue()',
    '[style.--size.px]': 'size()',
  },
  template: '{{ letters() }}',
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly size = input(32);

  readonly letters = computed(() => initials(this.name()));
  readonly hue = computed(() => avatarHue(this.name()));
}
