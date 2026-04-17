# Project Data And Role Model

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Goal

Expand `ProjectData` so the LA DOTD demo can carry scenario-specific metadata without breaking the current summary, report, draft, or sources flow.

## Current baseline

The current `ProjectData` shape is:

- `name`
- `contractNumber`
- `changeRequestId`

Those fields should remain intact for compatibility.

## Required additive fields

The LA DOTD demo branch should add the following fields to `ProjectData`:

- `state`
- `agency`
- `deliveryModel`
- `ownerClient`
- `userRole`
- `concessionaire`
- `builder`
- `leadDesigner`
- `demoProfile`
- `issueMode`

## Recommended expanded shape

```ts
interface ProjectData {
  name: string;
  contractNumber: string;
  changeRequestId: string;
  state?: string;
  agency?: string;
  deliveryModel?: string;
  ownerClient?: string;
  userRole?: string;
  concessionaire?: string;
  builder?: string;
  leadDesigner?: string;
  demoProfile?: string;
  issueMode?: string;
}
```

Optionality is recommended at first so existing consumers remain safe while the Louisiana demo fields are rolled in.

## Default demo profile values

For the Calcasieu demo, default values should align to:

- `name`: `I-10 Calcasieu River Bridge`
- `state`: `Louisiana`
- `agency`: `LA DOTD`
- `deliveryModel`: `P3 / design-build`
- `ownerClient`: `LA DOTD`
- `userRole`: `Arcadis internal reviewer`
- `concessionaire`: demo-specific value when available
- `builder`: demo-specific value when available
- `leadDesigner`: `Arcadis`
- `demoProfile`: `ladot-calcasieu`
- `issueMode`: `rejected-design-submittal`

## Role model

The role model should describe the lens the user is operating from, not a full permissions system.

### Primary demo role

`Arcadis internal reviewer`

This role is reviewing a live issue for:

- contract position
- design-review context
- commercial exposure
- schedule impact
- notice risk
- response preparation

### Supporting role vocabulary

Recommended normalized role values:

- `Arcadis internal reviewer`
- `Arcadis design lead`
- `Owner reviewer`
- `Builder reviewer`
- `Concessionaire reviewer`

The visible demo can stay focused on the Arcadis/internal-reviewer lens even if the underlying schema allows broader role labels later.

## Issue mode

`issueMode` should capture the primary problem framing for the analysis session.

Recommended initial values:

- `rejected-design-submittal`
- `owner-comment-cycle`
- `correspondence-driven-change`
- `redesign-pressure`
- `notice-risk`

For the first demo pass, one visible default is enough. The field exists so the app can shape copy and outputs consistently without exposing unfinished switching UI.

## How these fields should be used

### Intake

Use the expanded metadata to prefill or frame the intake experience for the Calcasieu scenario without overwhelming the user.

### Summary

Use the metadata to contextualize the issue and clarify the review lens.

### Report

Use the metadata in report headers, subject lines, and framing language.

### Draft

Use the metadata to keep the response voice aligned with the user’s role.

### Sources

Use the metadata only as context, not as a replacement for source traceability.

## Compatibility rules

- do not remove existing `name`, `contractNumber`, or `changeRequestId`
- do not require every downstream page to understand all new fields on day one
- do not hard-wire region switching into visible navigation
- do not let role metadata imply the system is giving formal legal advice

## Success condition

The project and role model is successful when the LA DOTD demo has enough structured context to feel deliberate and scenario-specific while the current route flow continues to work with additive, low-risk type changes.
