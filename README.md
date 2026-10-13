# Origin — loan operations prototype

A dependency-free front-end prototype for a U.S. personal-loan origination workflow. It supports applicant intake, client-side validation, application review queues, manually recorded decisions, offer acceptance, and a demo funding status.

## Run it

Open `index.html` in a modern browser. No build step, server, or package installation is required.

## Prototype boundaries

- Application data is held in JavaScript memory only. Refreshing or closing the page clears it.
- Do not enter real applicant, identity, financial, or other sensitive information.
- The app does not transmit data, call credit bureaus, verify identity or income, create loan documents, or make automated credit decisions.
- The workflow and field checks are illustrative, not legal, underwriting, or compliance advice. A production lender must define and validate applicable product, policy, security, privacy, accessibility, recordkeeping, and federal/state compliance requirements with qualified professionals.
- The “funded” action is a workflow demonstration only; it does not initiate or verify a payment.

## Included intake checks

The prototype validates required applicant and loan fields, email and phone formats, U.S. ZIP code format, a minimum applicant age of 18, requested amount bounds, non-negative financial obligations, and required authorization acknowledgments. It displays validation feedback at the field or workflow step.
