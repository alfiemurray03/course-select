# Sousa Murray individual course pricing

Individual Sousa Murray eLearning courses use a governed low-to-high complexity pricing model.

## Commercial calculation

1. Assign an internal base value from the course complexity band.
2. Apply a 30% commercial uplift.
3. Apply UK standard-rate VAT at 20% to the uplifted net selling price.
4. Store and display the resulting VAT-inclusive Stripe Price.

The 30% figure is a commercial uplift, not a VAT rate.

## VAT-inclusive customer price bands

| Band | Customer price |
| --- | ---: |
| Value | £7.99 |
| Essential | £11.00 |
| Standard | £13.99 |
| Enhanced | £16.99 |
| Professional | £22.99 |
| Extended | £29.99 |

Course complexity is determined from duration, module count, lesson count, final-assessment size and Foundation/Intermediate level. The website sends those factual catalogue metrics to Head Office Central Payments; Head Office recalculates the band and rejects a catalogue sync if the declared amount does not exactly match the governed calculation.

Every course is represented by its own Stripe Product and one-time active Stripe Price. Product and Price metadata mark the course as available for governed manual sales as well as website checkout.

The individual-course access duration is a separate commercial setting controlled by Head Office. The pricing model does not invent or change that access term.
