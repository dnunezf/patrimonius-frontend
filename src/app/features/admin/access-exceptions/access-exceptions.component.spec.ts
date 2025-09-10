import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessExceptionsComponent } from './access-exceptions.component';

describe('AccessExceptionsComponent', () => {
  let component: AccessExceptionsComponent;
  let fixture: ComponentFixture<AccessExceptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessExceptionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccessExceptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
