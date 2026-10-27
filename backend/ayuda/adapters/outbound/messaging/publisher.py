from ayuda.adapters.inbound.tasks.analysis import process_analysis


class CeleryEventPublisher:
    def publish(self, event):
        process_analysis.apply_async(args=[event.analysis_id], queue="analisis")
