import CustomerSearch from "./CustomerSearch";

/**
 * CustomerForm
 * Props:
 *  - customer: { name, addr, cityzip, phone1, phone2 }
 *  - onFieldChange(field, value): update a single customer field
 *  - onSelectCustomer(customer): a search result was picked
 *  - onCreateNew(name): "create new customer" was picked
 */
export default function CustomerForm({ customer, onFieldChange, onSelectCustomer, onCreateNew }) {
  return (
    <div className="ro-card">
      <h4>Customer</h4>

      <CustomerSearch
        nameValue={customer.name}
        onNameChange={(v) => onFieldChange("name", v)}
        onSelectCustomer={onSelectCustomer}
        onCreateNew={onCreateNew}
      />

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
