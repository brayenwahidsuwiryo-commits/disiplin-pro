# Disiplin Pro Scalability Policy

## Business limits

Disiplin Pro intentionally has **no application-level hard limit** for:

- number of schools (tenants);
- number of users/devices in a school;
- number of simultaneous sessions for an account.

The values 150 schools and 20 devices were planning scenarios, **not product limits**.

A deployment may therefore grow beyond 150 schools or beyond 20 devices per school without the application rejecting users because of those counts.

## Security boundary

Unlimited access does not mean shared data. Every school remains isolated by `school_id` and Supabase Row Level Security (RLS). Role permissions and audit logging remain enforced at the database layer.

## Concurrency

Concurrent writes must be handled atomically. Where optimistic versioning is available, updates should verify the record version before committing so simultaneous edits do not silently overwrite each other.

## Capacity

The application does not encode a business quota for schools/devices. Physical infrastructure can still have capacity constraints (database connections, CPU, memory, bandwidth, provider rate limits). Capacity management must be handled by scaling/optimization rather than introducing an arbitrary school/device count limit.
