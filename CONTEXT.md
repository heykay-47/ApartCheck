# ApartCheck Domain

ApartCheck manages residential societies, their occupants, and shared physical infrastructure.

## Language

**Society**:
A managed residential property that forms the ownership and access boundary for its units, members, and shared assets.
_Avoid_: Property, community, apartment complex, association

**Member**:
A person granted authenticated access to a Society. Each person has one Member record and exactly one current role within that Society; membership in another Society is separate.
_Avoid_: User, account, occupant

**Administrator**:
A Member responsible for configuring a Society and managing its Units, Members, and shared Assets.
_Avoid_: Admin, manager, operator

**Resident**:
A Member associated with exactly one current Unit for access purposes. Ownership does not matter; access follows the current Unit association, and reassignment replaces the prior association.
_Avoid_: Owner, tenant, occupant

**Technician**:
A Member authorized to inspect and maintain shared Assets. A Technician does not manage Society membership or Units by virtue of this role.
_Avoid_: Contractor, vendor, maintenance user

**Unit**:
A distinct residential dwelling within a Society, identified by building, floor, and unit number. Unit access does not imply ownership.
_Avoid_: Apartment, residence, property

**Asset**:
A shared physical system or equipment item within a Society that requires identification, location, and maintenance responsibility.
_Avoid_: Equipment, facility, inventory item

**Asset Code**:
A human-readable identifier that uniquely identifies an Asset within its Society.
_Avoid_: Serial number, tag, inventory number

**QR Token**:
A non-public lookup credential attached to an Asset for retrieving that Asset through a QR scan.
_Avoid_: QR code, asset code, public identifier

**Archive**:
A state in which a Unit or Asset remains recorded but is excluded from current operational use and ordinary listings.
_Avoid_: Delete, deactivate, remove
