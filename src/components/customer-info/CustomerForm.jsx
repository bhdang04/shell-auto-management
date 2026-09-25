import CustomerSearch from "./CustomerSearch";

/**
 * CustomerForm
 * Props:
 *  - customer: { first_name, last_name, addr, cityzip, phone1, phone2 }
 *  - onFieldChange(field, value): update a single customer field
 *  - onSelectCustomer(customer): a search result was picked
 *  - onCreateNew(name): "create new customer" was picked
 *  - onShowCustomers(): opens the full customer catalog browser
 */
export default function CustomerForm({
  customer,
  onFieldChange,
  onSelectCustomer,
  onCreateNew,
  onShowCustomers,
}) {
  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ");

  return (
    <div className="ro-card">
      <div className="ro-card-head">
        <h4>Customer</h4>
        <div className="ro-card-actions">
          <button className="ro-card-link" onClick={onShowCustomers}>
            Customers
          </button>
        </div>
      </div>

      <CustomerSearch
        nameValue={fullName}
        onNameChange={(v) => {
          const parts = v.trim().split(/\s+/);
          if (v.trim() === "") {
            onFieldChange("first_name", "");
            onFieldChange("last_name", "");
          } else if (parts.length === 1) {
            onFieldChange("first_name", parts[0]);
            onFieldChange("last_name", "");
          } else {
            const last = parts.pop();
            onFieldChange("first_name", parts.join(" "));
            onFieldChange("last_name", last);
          }
        }}
        onSelectCustomer={onSelectCustomer}
        onCreateNew={onCreateNew}
      />

      <div className="field-row">
        <div className="field">
          <label>First Name</label>
          <input value={customer.first_name} onChange={(e) => onFieldChange("first_name", e.target.value)} />
        </div>
        <div className="field">
          <label>Last Name</label>
          <input value={customer.last_name} onChange={(e) => onFieldChange("last_name", e.target.value)} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Address</label>
          <input value={customer.addr} onChange={(e) => onFieldChange("addr", e.target.value)} />
        </div>
        <div className="field">
          <label>City, State, Zip</label>
          <input
            value={customer.cityzip}
            onChange={(e) => onFieldChange("cityzip", e.target.value)}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Phone</label>
          <input value={customer.phone1} onChange={(e) => onFieldChange("phone1", e.target.value)} />
        </div>
        <div className="field">
          <label>Phone (alt)</label>
          <input value={customer.phone2} onChange={(e) => onFieldChange("phone2", e.target.value)} />
        </div>
      </div>
    </div>
  );
}