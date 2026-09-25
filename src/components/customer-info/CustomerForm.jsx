import CustomerSearch from "./CustomerSearch";

/**
 * CustomerForm
 * Props:
 *  - customer: { first_name, last_name, addr, cityzip, phone1, phone2 }
 *  - onFieldChange(field, value): update a single customer field
 *  - onSelectCustomer(customer): a search result was picked
 *  - onShowCustomers(): opens the full customer catalog browser
 */
export default function CustomerForm({ customer, onFieldChange, onSelectCustomer, onShowCustomers }) {
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
        firstName={customer.first_name}
        lastName={customer.last_name}
        onFirstNameChange={(v) => onFieldChange("first_name", v)}
        onLastNameChange={(v) => onFieldChange("last_name", v)}
        onSelectCustomer={onSelectCustomer}
      />

      <div className="field-row">
        <div className="field">
          <label>Address</label>
          <input value={customer.addr} onChange={(e) => onFieldChange("addr", e.target.value)} />
        </div>
        <div className="field">
          <label>City, State, Zip</label>
          <input value={customer.cityzip} onChange={(e) => onFieldChange("cityzip", e.target.value)} />
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