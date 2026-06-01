package com.bananaadvisory.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bananaadvisory.data.ReportEntity
import com.bananaadvisory.databinding.ItemReportBinding

class ReportAdapter(
    private val onClick: (ReportEntity) -> Unit
) : ListAdapter<ReportEntity, ReportAdapter.ViewHolder>(DiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemReportBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ViewHolder(private val binding: ItemReportBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(report: ReportEntity) {
            binding.cropText.text = report.crop.replaceFirstChar { it.uppercase() }
            binding.diagnosisText.text = report.diagnosis ?: "Pending analysis"
            binding.severityText.text = report.severity?.replaceFirstChar { it.uppercase() } ?: "Unknown"
            binding.dateText.text = report.createdAt?.substringBefore("T") ?: ""
            binding.syncStatusText.text = if (report.synced) "✓ Synced" else "⏳ Pending sync"

            binding.root.setOnClickListener { onClick(report) }
        }
    }

    class DiffCallback : DiffUtil.ItemCallback<ReportEntity>() {
        override fun areItemsTheSame(old: ReportEntity, new: ReportEntity) = old.localId == new.localId
        override fun areContentsTheSame(old: ReportEntity, new: ReportEntity) = old == new
    }
}
