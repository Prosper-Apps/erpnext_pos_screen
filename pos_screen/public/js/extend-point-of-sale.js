frappe.provide('erpnext.PointOfSale');
frappe.require('point-of-sale.bundle.js', function () {

    erpnext.PointOfSale.Controller = class KainotomoController extends erpnext.PointOfSale.Controller {
        constructor(wrapper) {
            super(wrapper);
        }

        async on_cart_update(args) {
            frappe.dom.freeze();
            let item_row = undefined;
            try {
                let { field, value, item } = args;
                item_row = this.get_item_from_frm(item);
                const item_row_exists = !$.isEmptyObject(item_row);
    
                const from_selector = field === 'qty';
                if (from_selector)
                    value = flt(item_row.stock_qty) + flt(value);
    
                if (item_row_exists) {
                    if (field === 'qty')
                        value = flt(value);
    
                    if (['qty', 'conversion_factor'].includes(field) && value > 0 && !this.allow_negative_stock) {
                        const qty_needed = field === 'qty' ? value * item_row.conversion_factor : item_row.qty * value;
                        await this.check_stock_availability(item_row, qty_needed, this.frm.doc.set_warehouse);
                    }
    
                    if (this.is_current_item_being_edited(item_row) || from_selector) {
                        await frappe.model.set_value(item_row.doctype, item_row.name, field, value);
                        this.update_cart_html(item_row);
                    }
    
                } else {
                    if (!this.frm.doc.customer)
                        return this.raise_customer_selection_alert();
    
                    const { item_code, batch_no, serial_no, rate } = item;
    
                    if (!item_code)
                        return;
    
                    const new_item = { item_code, batch_no, rate, [field]: value };
    
                    if (serial_no) {
                        await this.check_serial_no_availablilty(item_code, this.frm.doc.set_warehouse, serial_no);
                        new_item['serial_no'] = serial_no;
                    }
    
                    if (field === 'serial_no')
                        new_item['qty'] = value.split(`\n`).length || 0;
    
                    item_row = this.frm.add_child('items', new_item);
    
                    if (field === 'qty' && value !== 0 && !this.allow_negative_stock) {
                        const qty_needed = value * item_row.conversion_factor;
                        await this.check_stock_availability(item_row, qty_needed, this.frm.doc.set_warehouse);
                    }
    
                    await this.trigger_new_item_events(item_row);
    
                    this.update_cart_html(item_row);
    
                    if (this.item_details.$component.is(':visible'))
                        this.edit_item_details_of(item_row);
    
                    if (this.check_serial_batch_selection_needed(item_row) && !this.item_details.$component.is(':visible'))
                        this.edit_item_details_of(item_row);
                }
    
            } catch (error) {
                console.log(error);
            } finally {
                frappe.dom.unfreeze();
                return item_row;
            }
        }
    };

    erpnext.PointOfSale.ItemSelector = class KainotomoItemSelector extends erpnext.PointOfSale.ItemSelector {
        constructor(wrapper) {
            super(wrapper);
        }

        prepare_dom() {
            super.prepare_dom();

            this.$component.find('.items-selector').prevObject.prepend(`
                <div class="pos_screen-section">
                    <div class="quantity-field"></div>
                </div>
            `);
        }

        make_search_bar() {
            super.make_search_bar();

            const me = this;
            const doc = me.events.get_frm().doc;
            
            // Make select group control
            this.$component.find('.item-group-field').html('');
            this.item_group_field = frappe.ui.form.make_control({
                df: {
                    label: __('Item Group'),
                    fieldtype: 'Select',
                    default: "All Item Groups",
                    options: [],
                    onchange: function() {
                        me.item_group = this.value;
                        !me.item_group && (me.item_group = me.parent_item_group);
                        me.filter_items();
                    },
                    placeholder: __('Select item group'),							
                },
                parent: this.$component.find('.item-group-field'),
                render_input: true,
            });
            
            this.item_group_field.toggle_label(false);

            const selectField = this.item_group_field;
            frappe.call({
                method: 'frappe.desk.search.search_link',
                args: {
                    doctype: 'Item Group',
                    txt: '',
                    reference_doctype: '',
                    query: 'erpnext.selling.page.point_of_sale.point_of_sale.item_group_query',
                    filters: {
                        pos_profile: doc ? doc.pos_profile : ''
                    }
                },
                callback: function (response) {
                    if (response) {
                        selectField.df.options = '';

                        for (let i = 0; i < response.results.length; i++) {
                            selectField.df.options += response.results[i].value + (i !== response.results.length - 1 ? '\n' : '');
                        }

                        console.log(selectField.df.options);

                        selectField.refresh();                    
                    }
                },
            });

            // make quantity control
            this.$component.find('.quantity-field').html('');
            this.quantity_field = frappe.ui.form.make_control({
                df: {
                    label: __('Quantity'),
                    fieldtype: 'Int',
                    placeholder: __('Quantity'),							
                    default: 1,
                },
                parent: this.$component.find('.quantity-field'),
                render_input: true,
            });
            this.quantity_field.toggle_label(false);
        }

        bind_events() {
            super.bind_events();

            const me = this;
            this.$component.off('click', '.item-wrapper');
            this.$component.on('click', '.item-wrapper', function() {
                const $item = $(this);
                const item_code = unescape($item.attr('data-item-code'));
                let batch_no = unescape($item.attr('data-batch-no'));
                let serial_no = unescape($item.attr('data-serial-no'));
                let uom = unescape($item.attr('data-uom'));
                let rate = unescape($item.attr('data-rate'));
                let quantity = me.quantity_field.value ?? 1;
    
                // escape(undefined) returns "undefined" then unescape returns "undefined"
                batch_no = batch_no === "undefined" ? undefined : batch_no;
                serial_no = serial_no === "undefined" ? undefined : serial_no;
                uom = uom === "undefined" ? undefined : uom;
                rate = rate === "undefined" ? undefined : rate;
    
                me.events.item_selected({
                    field: 'qty',
                    value: "+" + quantity,
                    item: { item_code, batch_no, serial_no, uom, rate }
                });
                
                me.search_field.set_focus();
            });
        }

    };

    erpnext.PointOfSale.ItemCart = class KainotomoItemCart extends erpnext.PointOfSale.ItemCart {
        constructor(wrapper) {
            super(wrapper);
        }

        render_taxes(taxes) {
            super.render_taxes(taxes);
            this.$totals_section.find('.tax-label').html(__('Tax'))
        }
    }

    erpnext.PointOfSale.PastOrderSummary = class KainotomoPastOrderSummary extends erpnext.PointOfSale.PastOrderSummary {
        constructor(wrapper) {
            super(wrapper);
        }

        get_taxes_html(doc) {
            let taxes_html = super.get_taxes_html(doc);
            var $html = $(taxes_html);
            $html.find('.tax-label').text(__('Tax'));
            var updatedHtmlString = $html.html();
            return '<div class="taxes-wrapper">' + updatedHtmlString + '</div>';
        }
    }

    //wrapper.pos = new erpnext.PointOfSale.Controller(wrapper);
    //window.cur_pos = wrapper.pos;
    
});