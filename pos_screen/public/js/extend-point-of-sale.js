frappe.provide('erpnext.PointOfSale');

let newWindow;

frappe.require('point-of-sale.bundle.js', function () {

    get_print_format_printer_map =  function () {
		// returns the whole object "print_format_printer_map" stored in the localStorage.
		try {
			let print_format_printer_map = JSON.parse(localStorage.print_format_printer_map);
			return print_format_printer_map;
		} catch (e) {
			return {};
		}
	}

    get_mapped_printer = function () {
        // returns a list of "print format: printer" mapping filtered by the current print format
		let print_format_printer_map = get_print_format_printer_map();

        // Check if print_format_printer_map list length is not zero
        if (Object.keys(print_format_printer_map).length === 0) {
            frappe.throw(__("Please set Print Format Printer Mapping in POS Profile"));
        } else {
            return print_format_printer_map["POS Invoice"][0].printer;
        }            
    }    

    qz_connect = function ( doc = undefined) {
        return new Promise(function (resolve, reject) {
            frappe.ui.form.qz_init().then(() => {

                if (qz.websocket.isActive()) {
                    // if already active, resolve immediately
                    resolve(doc);
                } else {
                    // Signing certificate
                    qz.security.setCertificatePromise(function(resolve, reject) {
                       fetch("/assets/pos_screen/qz_signing/digital-certificate.txt", {cache: 'no-store', headers: {'Content-Type': 'text/plain'}})
                          .then(function(data) { data.ok ? resolve(data.text()) : reject(data.text()); });
                    });

                    qz.security.setSignaturePromise(function(toSign) {
                    return function(resolve, reject) {
                        frappe.call({
                            method: "pos_screen.pos_screen.page.pos_screen.pos_screen.get_signature",
                            args: { message: toSign },
                            callback: function(r) {
                                resolve(r.message);
                            }
                        });                            
                    };
                    });
    
                    qz.websocket.connect().then(
                        () => {
                            resolve(doc);
                        },
                        function retry(err) {
                            if (err.message === "Unable to establish connection with QZ") {
                                window.location.assign("qz:launch");
                                qz.websocket
                                    .connect({
                                        retries: 3,
                                        delay: 1,
                                    })
                                    .then(
                                        () => {
                                            resolve(doc);
                                        },
                                        () => {
                                            frappe.throw(
                                                __(
                                                    'Error connecting to QZ Tray Application...<br><br> You need to have QZ Tray application installed and running, to use the Raw Print feature.<br><br><a target="_blank" href="https://qz.io/download/">Click here to Download and install QZ Tray</a>.<br> <a target="_blank" href="https://erpnext.com/docs/user/manual/en/setting-up/print/raw-printing">Click here to learn more about Raw Printing</a>.'
                                                )
                                            );
                                            reject();
                                        }
                                    );
                            } else {
                                reject();
                            }
                        }
                    );
                }
            });
        });
    };

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
                <div class="pos_screen-button-field"></div>
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
                    onchange: function () {
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

            this.$component.find('.quantity-field').html('');
            // create customer window button
            this.pos_screen_button = frappe.ui.form.make_control({
                df: {
                    label: __('Customer Screen'),
                    fieldtype: 'Button',
                    btn_size: 'xs'
                },
                parent: this.$component.find('.pos_screen-button-field'),
                render_input: true,
            });
            this.pos_screen_button.toggle_label(false);

            this.pos_screen_button.$input.on('click', function () {
                me.openWindow();
            });

            // make quantity control
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
            this.$component.on('click', '.item-wrapper', function () {
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

        openWindow() {
            const me = this;
            newWindow = window.open("", "posCustomerWindow", "width=400,height=400");
            newWindow.document.write("<!DOCTYPE html><html data-theme-mode=\"light\" data-theme=\"light\" dir=\"ltr\" lang=\"en\" class=\"chrome\"><head>");
            newWindow.document.write("<title>New Window</title>");
            //newWindow.document.write(document.head.innerHTML);
            newWindow.document.write("</head><body>");
            newWindow.document.write(
                `<div class="cart-container2">
                    <div class="cart-label">Item Cart</div>
                    <div class="cart-totals-section">
                        <div class="add-discount-wrapper">
                            ${$('.add-discount-wrapper')[0].innerHTML}
                        </div>
                        <div class="item-qty-total-container">
                            ${$('.item-qty-total-container')[0].innerHTML}
                        </div>
                        <div class="net-total-container">
                            ${$('.net-total-container')[0].innerHTML}
                        </div>
                        <div class="taxes-container">
                            ${$('.taxes-container')[0].innerHTML}
                        </div>
                        <div class="grand-total-container">
                            ${$('.grand-total-container')[0].innerHTML}
                        </div>
                    </div>
                </div>`
            );
            newWindow.document.write("</body></html>");
            newWindow.document.close();

            var links = document.getElementsByTagName('link');
            for (var i = 0; i < links.length; i++) {
                var link = links[i];
                if (link.rel === 'stylesheet') {
                    var newLink = newWindow.document.createElement('link');
                    newLink.rel = 'stylesheet';
                    newLink.href = link.href;
                    newWindow.document.head.appendChild(newLink);
                }
            }

            setInterval(me.updateCart, 1000);
        }

        updateCart() {
            newWindow.document.body.innerHTML =
                `<div class="cart-container2">
                <div class="cart-label">Item Cart</div>
                <div class="cart-totals-section">
                    <div class="add-discount-wrapper">
                        ${$('.add-discount-wrapper')[0].innerHTML}
                    </div>
                    <div class="item-qty-total-container">
                        ${$('.item-qty-total-container')[0].innerHTML}
                    </div>
                    <div class="net-total-container">
                        ${$('.net-total-container')[0].innerHTML}
                    </div>
                    <div class="taxes-container">
                        ${$('.taxes-container')[0].innerHTML}
                    </div>
                    <div class="grand-total-container">
                        ${$('.grand-total-container')[0].innerHTML}
                    </div>
                </div>
            </div>`;
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

        print_receipt() {
            let doc = this.doc;
            qz_connect(doc)
                .then(function (doc) {                    
                    var data = [];
                    data.push('\x1B' + '\x40'); // init
                    data.push('\x1B' + '\x61' + '\x31'); // center align
                    data.push('\x0A'); // line break
                    data.push('\x0A'); // line break
                    data.push('--------------------------------' + '\x0A');
                    data.push(doc.company + '\x0A');
                    data.push('Archiepiskopou Makariou III 44, Aradippou 7102, Cyprus' + '\x0A');
                    data.push('Tel. +357 24333773' + '\x0A');
                    data.push('\x0A'); // line break

                    data.push('\x1B' + '\x61' + '\x30'); // left align

                    data.push('\x1B' + '\x45' + '\x0D'); // bold on
                    data.push('Receipt No: ');
                    data.push('\x1B' + '\x45' + '\x20'); // bold off
                    data.push(doc.name + '\x0A');

                    data.push('\x1B' + '\x45' + '\x0D'); // bold on
                    data.push('Cashier: ');
                    data.push('\x1B' + '\x45' + '\x20'); // bold off
                    data.push(doc.owner + '\x0A');

                    data.push('\x1B' + '\x45' + '\x0D'); // bold on
                    data.push('Customer: ');
                    data.push('\x1B' + '\x45' + '\x20'); // bold off
                    data.push(doc.customer_name + '\x0A');

                    data.push('\x1B' + '\x45' + '\x0D'); // bold on
                    data.push('Date: ');
                    data.push('\x1B' + '\x45' + '\x20'); // bold off
                    data.push(doc.posting_date + '\x0A');

                    data.push('\x1B' + '\x45' + '\x0D'); // bold on
                    data.push('Time: ');
                    data.push('\x1B' + '\x45' + '\x20'); // bold off
                    data.push(doc.posting_time + '\x0A');

                    data.push('\x0A'); // line break
                    data.push('\x0A'); // line break
                    data.push('Item Qty Amount' + '\x0A');
                    data.push('\x1B' + '\x45' + '\x20'); // bold off

                    // Loop through doc.items
                    for (let i = 0; i < doc.items.length; i++) {
                        let item = doc.items[i];
                        data.push(item.item_name + ' ' + item.qty + ' x ' + item.rate + ' = €' + item.amount + '\x0A');
                        data.push('\x0A'); // line break
                    }

                    // Net Total
                    data.push('\x1B' + '\x45' + '\x0D'); // bold on
                    data.push('Total: ');
                    data.push('\x1B' + '\x45' + '\x20'); // bold off
                    data.push('€' + doc.net_total + '\x0A');

                    // Loop thrugh doc.taxes
                    for (let i = 0; i < doc.taxes.length; i++) {
                        let tax = doc.taxes[i];
                        data.push('\x1B' + '\x45' + '\x0D'); // bold on
                        data.push(tax.description + ': ');
                        data.push('\x1B' + '\x45' + '\x20'); // bold off
                        data.push('€' + tax.tax_amount + '\x0A');
                    }

                    // If doc.discount_amount then show it
                    if (doc.discount_amount) {
                        data.push('\x1B' + '\x45' + '\x0D'); // bold on
                        data.push('Discount: ');
                        data.push('\x1B' + '\x45' + '\x20'); // bold off
                        data.push('€' + doc.discount_amount + '\x0A');
                    }

                    // Grand Total
                    data.push('\x1B' + '\x45' + '\x0D'); // bold on
                    data.push('Grand Total: ');
                    data.push('\x1B' + '\x45' + '\x20'); // bold off
                    data.push('€' + doc.grand_total + '\x0A');

                    // Loop through doc.payments
                    for (let i = 0; i < doc.payments.length; i++) {
                        let payment = doc.payments[i];
                        data.push('\x1B' + '\x45' + '\x0D'); // bold on
                        data.push(payment.mode_of_payment + ': ');
                        data.push('\x1B' + '\x45' + '\x20'); // bold off
                        data.push('€' + payment.amount + '\x0A');
                    }

                    // Show doc.paid_amount
                    data.push('\x1B' + '\x45' + '\x0D'); // bold on
                    data.push('Paid Amount: ');
                    data.push('\x1B' + '\x45' + '\x20'); // bold off
                    data.push('€' + doc.paid_amount + '\x0A');

                    // Show doc.change_amount
                    data.push('\x1B' + '\x45' + '\x0D'); // bold on
                    data.push('Change Amount: ');
                    data.push('\x1B' + '\x45' + '\x20'); // bold off
                    data.push('€' + doc.change_amount + '\x0A');

                    // center align
                    data.push('\x1B' + '\x61' + '\x31');
                    data.push('\x0A'); // line break
                    data.push('Thank you, please visit again.' + '\x0A');

                    data.push('--------------------------------' + '\x0A' + '\x0A');
                    data.push('\x0A' + '\x0A' + '\x0A' + '\x0A' + '\x0A' + '\x0A' + '\x0A');
                    data.push('\x1B' + '\x69') // Cut paper
                    
                    let config = qz.configs.create(get_mapped_printer());
                    return qz.print(config, data);
                })
                .then(frappe.ui.form.qz_success)
                .catch((err) => {
                    frappe.ui.form.qz_fail(err);
                });
        }

    }

    erpnext.PointOfSale.Payment = class KainotomoPayment extends erpnext.PointOfSale.Payment {
        constructor(wrapper) {
            super(wrapper);
        }

        checkout() {
            this.open_drawer();
            this.events.toggle_other_sections(true);
            this.toggle_component(true);
            
            this.render_payment_section();
            this.after_render();
        }

        open_drawer() {
            qz_connect()
                .then(function () {
                    var data = [
                       '\x1B' + '\x40',          // init                       
                       '\x10' + '\x14' + '\x01' + '\x00' + '\x05',  // Generate Pulse to kick-out cash drawer**
                       ];
                    let config = qz.configs.create(get_mapped_printer());
                    return qz.print(config, data);
                })
                .catch((err) => {
                    frappe.ui.form.qz_fail(err);
                });
        }
    }

    //wrapper.pos = new erpnext.PointOfSale.Controller(wrapper);
    //window.cur_pos = wrapper.pos;    

});