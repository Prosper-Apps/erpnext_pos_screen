# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: MIT. See LICENSE

from typing import TYPE_CHECKING

import frappe
from frappe.utils import convert_utc_to_user_timezone
from frappe.utils.background_jobs import get_queues, get_workers
from frappe.utils.scheduler import is_scheduler_inactive

if TYPE_CHECKING:
	from rq.job import Job

JOB_COLORS = {"queued": "orange", "failed": "red", "started": "blue", "finished": "green"}


@frappe.whitelist()
def get_info(pos_profile=None) -> list[dict]:
	entry_list = frappe.get_list("POS Opening Entry", filters={"docstatus": 1, "status": "Open", "pos_profile": pos_profile}, fields=["name", "status"])
	if entry_list:
		pos_opening_entry = frappe.get_doc("POS Opening Entry", entry_list[0].name)
		pos_invoice_list = frappe.get_list("POS Invoice")
		pos_invoice = frappe.get_doc("POS Invoice", pos_invoice_list[0].name)
	return entry_list


@frappe.whitelist()
def remove_failed_jobs():
	queues = get_queues()
	for queue in queues:
		fail_registry = queue.failed_job_registry
		for job_id in fail_registry.get_job_ids():
			job = queue.fetch_job(job_id)
			fail_registry.remove(job, delete_job=True)


@frappe.whitelist()
def get_pos_profiles():
	return frappe.get_list("POS Profile", filters={"Disabled": "No"}, fields=["name as label", "name as value"])
