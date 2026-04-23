<template>
  <div class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">Exposure Results</div>
      <q-space />
      <q-btn flat color="primary" label="Back to Exposure" to="/exposure" />
    </div>

    <q-card class="q-mb-md">
      <q-card-section>
        <div><b>Result dataset</b>: {{ resultDatasetId }}</div>
        <div v-if="taskUuid"><b>Task UUID</b>: {{ taskUuid }}</div>
        <div v-if="elapsedMs != null"><b>Elapsed</b>: {{ elapsedMs }} ms</div>
        <div v-if="warning" class="text-warning q-mt-sm">{{ warning }}</div>
      </q-card-section>
    </q-card>

    <q-table
      flat
      bordered
      dense
      title="Results"
      :rows="rows"
      :columns="columns"
      row-key="__rowkey"
      :loading="loading"
      :pagination="pagination"
      @request="onRequest"
      :rows-per-page-options="[10, 25, 50, 100, 250, 500, 1000]"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import axios from "axios";

export default defineComponent({
  name: "ExposureResults",
  setup() {
    const route = useRoute();
    const resultDatasetId = Number(route.params.resultDatasetId);
    const taskUuid = route.query.taskUuid || "";
    const elapsedMs = route.query.elapsedMs ? Number(route.query.elapsedMs) : null;
    const warning = route.query.warning || "";

    const loading = ref(false);
    const rows = ref([]);
    const columns = ref([]);

    const pagination = ref({
      page: 1,
      rowsPerPage: 50,
      rowsNumber: 0, // unknown; backend doesn't return total
      sortBy: "column",
      descending: false,
    });

    const buildColumnsFromRow = (row) => {
      const keys = Object.keys(row || {}).filter((k) => k !== "__rowkey");
      return keys.map((k) => ({
        name: k,
        label: k,
        field: k,
        align: typeof row[k] === "number" ? "right" : "left",
        sortable: true,
      }));
    };

    const fetchPage = async ({ page, rowsPerPage }) => {
      loading.value = true;
      try {
        const res = await axios.get(
          process.env.API_SERVER +
            `/api/exposure-result-datasets/${resultDatasetId}/contents`,
          {
            params: {
              gridId: 0,
              page,
              rowsPerPage,
            },
            validateStatus: (s) => s < 500,
          }
        );

        if (res.status >= 400) {
          throw new Error(res.data?.message || "Failed to load results");
        }

        const records = res.data || [];
        rows.value = records.map((r, i) => ({ __rowkey: i + (page - 1) * rowsPerPage, ...r }));
        if (!columns.value.length && rows.value.length) {
          columns.value = buildColumnsFromRow(rows.value[0]);
        }
      } finally {
        loading.value = false;
      }
    };

    const onRequest = async (props) => {
      // q-table server request
      pagination.value = props.pagination;
      await fetchPage(props.pagination);
    };

    onMounted(async () => {
      await fetchPage(pagination.value);
    });

    return {
      resultDatasetId,
      taskUuid,
      elapsedMs,
      warning,
      loading,
      rows,
      columns,
      pagination,
      onRequest,
    };
  },
});
</script>

