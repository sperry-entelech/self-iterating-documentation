# AI Agent Bug Fixing Standard Operating Procedure

## Overview

This document establishes the standard operating procedure (SOP) for AI coding agents (Cursor, Claude Code, etc.) when fixing bugs in the Context Version Control project. This ensures consistent, high-quality bug fixes that maintain the integrity of the version control system.

**This SOP is part of the self-iterating documentation system** - it should be automatically referenced and updated as the project evolves.

## The Protocol

When fixing a bug, AI agents MUST follow this exact sequence:

### 1. Identify the Root Cause
- Analyze the error message, stack trace, and related code
- Trace the issue to its source
- Understand **why** the bug exists, not just **what's** broken
- Look for patterns, similar issues, or related code
- Consider version control implications (does this affect commit history, temporal queries, etc.?)

### 2. Implement the Fix
- Make the minimal necessary changes to resolve the root cause
- Ensure the fix addresses the underlying issue, not just symptoms
- Follow existing code patterns and conventions
- Maintain consistency with the codebase style
- **Critical**: Ensure version control integrity is maintained (no data loss, proper commit tracking)

### 3. Verify with Linting
- Run linter checks on all modified files
- Fix any linting errors or warnings
- Ensure code quality standards are met
- Verify no new linting issues were introduced
- For TypeScript projects: Ensure type checking passes

### 4. End with Summary
- **ALWAYS** end your response with a simple one-sentence summary
- Use **exactly 3 alarm emojis** (🚨🚨🚨)
- This summary must be the **very last sentence** in your response
- Format: `🚨🚨🚨 [One sentence describing what was fixed]`

## Example Response

```
## Root Cause Analysis

The `/api/context/at/:timestamp` endpoint was incorrectly querying the database, returning future-dated states when querying past dates due to a timezone conversion bug in the date parsing logic.

## Implementation

Fixed the temporal query by:
- Correcting timezone handling in date parsing
- Adding proper date range validation
- Ensuring queries only return states that existed at or before the requested timestamp
- Added unit tests for edge cases (timezone boundaries, invalid dates)

## Linting Verification

✅ No linting errors
✅ TypeScript types correct
✅ Code follows project conventions
✅ Tests pass

🚨🚨🚨 Fixed temporal query endpoint to correctly handle timezone conversions and prevent returning future states for past date queries.
```

## Integration with Context Version Control

This SOP is designed to work with the self-iterating documentation system:

1. **Version Control**: The SOP is stored in `.cursorrules` file that is committed to Git
2. **Context Awareness**: AI agents automatically reference these rules when working on the project
3. **Self-Update**: As the SOP evolves, it updates itself in the documentation
4. **Cross-Project**: The same SOP can be applied across multiple projects

## Project-Specific Considerations

### Version Control Integrity
- **Never** modify commit history directly
- Ensure all changes maintain referential integrity
- Test temporal queries after fixes
- Verify rollback functionality still works

### Cloudflare Workers
- Test locally with `wrangler dev` before deploying
- Verify environment variables are correctly referenced
- Check KV namespace bindings
- Ensure edge function compatibility

### Supabase Integration
- Verify database schema compatibility
- Test connection pooling
- Ensure proper error handling for connection failures
- Validate JSONB field updates

## Implementation Files

- **`.cursorrules`** - Cursor IDE configuration (project root)
- **`AI-AGENT-BUG-FIXING-SOP.md`** - Full documentation (this file)

## Setup Instructions

1. The `.cursorrules` file is already in the project root
2. Commit to Git: `git add .cursorrules && git commit -m "Add AI agent bug fixing SOP"`
3. AI agents will automatically use these rules

## Customization

You can customize this SOP for specific needs:
- Add Cloudflare Workers-specific linting commands
- Include Supabase migration verification
- Add temporal query testing requirements
- Include deployment verification steps

## Benefits

- **Consistency**: All bug fixes follow the same high-quality process
- **Traceability**: Root cause analysis makes fixes more maintainable
- **Quality**: Linting verification catches issues early
- **Communication**: Summary provides quick understanding of what was fixed
- **Documentation**: Self-iterating system keeps documentation current
- **Version Control Safety**: Ensures fixes don't break version control functionality

## Version History

- **v1.0** (2025-01-XX): Initial SOP based on proven bug-fixing methodology
- This document should be updated as the SOP evolves

## Related Documentation

- **QUICKSTART.md** - Setup and deployment guide
- **README.md** - Full project documentation
- **DEPLOYMENT.md** - Deployment procedures

