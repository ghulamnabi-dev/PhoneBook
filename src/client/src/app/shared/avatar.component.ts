import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { avatarTone, initials } from './avatar';

/** Initials on one of five palette tones, chosen from the name. Decorative: the name is always rendered next to it. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'avatar',
    'aria-hidden': 'true',
    '[attr.data-tone]': 'tone()',
    '[style.--size.px]': 'size()',
  },
  template: '{{ letters() }}',
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly size = input(32);

  readonly letters = computed(() => initials(this.name()));
  readonly tone = computed(() => avatarTone(this.name()));
}
