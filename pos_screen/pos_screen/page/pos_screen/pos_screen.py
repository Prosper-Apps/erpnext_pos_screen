# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: MIT. See LICENSE

from typing import TYPE_CHECKING

import frappe
from frappe.utils import convert_utc_to_user_timezone
from frappe.utils.background_jobs import get_queues, get_workers
from frappe.utils.scheduler import is_scheduler_inactive

import base64
import os
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
import sys
#from django.http import HttpResponse, HttpResponseBadRequest

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

@frappe.whitelist()
def get_signature(message):
	# Load signature
	file_path = os.path.dirname(os.path.realpath(__file__)) + "/private-key.pem"
	key = serialization.load_pem_private_key(open(file_path,"rb").read(), None, backend=default_backend())
	# Create the signature
	signature = key.sign(message.encode('utf-8'), padding.PKCS1v15(), hashes.SHA1())  # Use hashes.SHA1() for QZ Tray 2.0 and older

	# Return the signature in a base64-encoded format as a string
	return base64.b64encode(signature).decode('utf-8')
