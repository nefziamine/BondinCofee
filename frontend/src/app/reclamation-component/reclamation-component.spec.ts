import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReclamationComponent } from './reclamation-component';

describe('ReclamationComponent', () => {
  let component: ReclamationComponent;
  let fixture: ComponentFixture<ReclamationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReclamationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReclamationComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
