<template>
  <q-card style="min-width: 900px; max-width: 95vw">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">Exposure Results</div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section class="text-body2">
      <div><b>Result dataset</b>: {{ resultDatasetId }}</div>
      <div><b>Task UUID</b>: {{ taskUuid }}</div>
      <div><b>Elapsed</b>: {{ elapsedMs }} ms</div>
      <div v-if="warning" class="text-warning q-mt-sm">
        {{ warning }}
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <q-table
        dense
        flat
        :rows="records"
        :columns="columns"
        row-key="__rowkey"
        :rows-per-page-options="[5, 10, 25, 50, 100]"
      />
    </q-card-section>

    <q-card-actions align="right">
      <q-btn color="primary" label="Close" v-close-popup />
    </q-card-actions>
  </q-card>
</template>

<script>
import { defineComponent, computed } from "vue";

export default defineComponent({
  name: "CheckResultDialog",
  props: {
    taskUuid: { type: String, required: true },
    resultDatasetId: { type: Number, required: true },
    elapsedMs: { type: Number, required: true },
    records: { type: Array, required: true },
    warning: { type: String, default: "" },
  },
  setup(props) {
    const columns = computed(() => {
      const sample = props.records?.[0] ?? {};
      const keys = Object.keys(sample);
      return keys.map((k) => ({
        name: k,
        label: k,
        field: k,
        align: typeof sample[k] === "number" ? "right" : "left",
        sortable: true,
      }));
    });

    return { columns };
  },
});
</script>

