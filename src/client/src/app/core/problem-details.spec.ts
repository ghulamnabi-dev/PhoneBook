import { HttpErrorResponse } from '@angular/common/http';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { applyServerErrors, problemMessage, toControlName, toControlPath } from './problem-details';

const problem = (errors: Record<string, string[]>) =>
  new HttpErrorResponse({ status: 400, error: { title: 'One or more validation errors occurred.', errors } });

describe('problem details', () => {
  it('maps PascalCase API fields to camelCase control names', () => {
    expect(toControlName('FirstName')).toBe('firstName');
    expect(toControlName('$.email')).toBe('email');
  });

  it('maps indexed API fields to FormArray paths', () => {
    expect(toControlPath('Phones[1].Number')).toBe('phones.1.number');
    expect(toControlPath('$.phones[0].label')).toBe('phones.0.label');
    expect(toControlPath('Email')).toBe('email');
  });

  it('puts server messages on matching controls, including FormArray rows, and reports the rest', () => {
    const form = new FormGroup({
      firstName: new FormControl(''),
      phones: new FormArray([new FormGroup({ label: new FormControl('Mobile'), number: new FormControl('12') })]),
    });
    const result = applyServerErrors(
      form,
      problem({ FirstName: ['Required.'], 'Phones[0].Number': ['Must be 5–25 characters.'], Other: ['Nope.'] }),
    );
    expect(result.handled).toBeTrue();
    expect(result.unmapped).toEqual(['Nope.']);
    expect(form.controls.firstName.getError('server')).toBe('Required.');
    expect(form.get('phones.0.number')?.getError('server')).toBe('Must be 5–25 characters.');
  });

  it('ignores errors that are not validation problems', () => {
    const form = new FormGroup({ name: new FormControl('') });
    expect(applyServerErrors(form, new HttpErrorResponse({ status: 409 })).handled).toBeFalse();
    expect(applyServerErrors(form, new HttpErrorResponse({ status: 400, error: { title: 'Bad' } })).handled).toBeFalse();
  });

  it('reads detail, then title, from a ProblemDetails body', () => {
    expect(problemMessage(new HttpErrorResponse({ status: 409, error: { title: 'Conflict', detail: 'A group named "Work" already exists.' } }))).toBe(
      'A group named "Work" already exists.',
    );
    expect(problemMessage(new HttpErrorResponse({ status: 404, error: { title: 'Not Found' } }))).toBe('Not Found');
    expect(problemMessage(new HttpErrorResponse({ status: 500 }))).toBeNull();
  });
});
