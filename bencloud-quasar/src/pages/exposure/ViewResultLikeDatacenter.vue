<template>
  <div class="task-results-page">
    <div class="link-to-magage-tasks">
      <router-link to="/exposure">Back to Exposure</router-link>
    </div>

    <div class="info task-pollutant">
      <p class="label">Pollutant:</p>
      <p>{{ pollutant_name }}</p>
    </div>
    <div class="info batch-task-name">
      <p class="label">Task:</p>
      <p>{{ task_name }}</p>
    </div>
    <div class="info task-pre-policy">
      <p class="label">Pre-policy: </p>
      <p>{{ task_pre_policy }}</p>
    </div>
    <div class="info aq_grid_definition_name">
      <p class="label">AQ Geography:</p>
      <p>{{ aq_grid_definition_name }}</p>
    </div>
    <div class="info task-metric">
      <p class="label"> Metric: </p>
      <p>{{ task_metric }}</p>
    </div>
    <div class="info task-completed-date" v-if="elapsed_ms">
      <p class="label">Elapsed: </p>
      <p>{{ elapsed_ms }} ms</p>
    </div>
    <div class="info" v-if="warning">
      <p class="label">Note:</p>
      <p class="text-warning">{{ warning }}</p>
    </div>

    <div class="task-results">
      <TaskResultsTabs
        v-bind:task_uuid_with_type="task_uuid_with_type"
        v-bind:task_name="task_name"
        v-bind:valuation_task_uuid_with_type="valuation_task_uuid_with_type"
        v-bind:valuation_task_name="valuation_task_name"
        v-bind:task_pop_id="task_pop_id"
        v-bind:batch_task_id="batch_task_id"
        v-bind:valuation_grid_id="valuation_grid_id"
        v-bind:valuation_grid_name="valuation_grid_name"
        v-bind:pollutant_name="pollutant_name"
        :key="componentKey"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onBeforeMount } from "vue";
import { useRoute } from "vue-router";
import axios from "axios";

import TaskResultsTabs from "src/components/datacenter/tasks/TaskResultsTabs.vue";

export default defineComponent({
  name: "ExposureViewResultLikeDatacenter",
  components: { TaskResultsTabs },
  setup() {
    const route = useRoute();
    const resultDatasetId = route.params.resultDatasetId;

    const task_uuid_with_type = ref("");
    const valuation_task_uuid_with_type = ref("");
    const valuation_task_name = ref("");
    const batch_task_id = ref(0);
    const valuation_grid_id = ref(0);
    const valuation_grid_name = ref("");
    const componentKey = ref(0);

    const pollutant_name = ref("");
    const task_pre_policy = ref("");
    const aq_grid_definition_name = ref("");
    const task_metric = ref("");
    const task_name = ref("");
    const task_pop_id = ref("");

    const elapsed_ms = ref(route.query.elapsedMs || "");
    const warning = ref(route.query.warning || "");

    onBeforeMount(() => {
      (async () => {
        const info = await axios.get(
          process.env.API_SERVER + `/api/exposure-result-datasets/${resultDatasetId}/info`
        );

        pollutant_name.value = info.data.pollutantName;
        task_pre_policy.value = info.data.prePolicyName;
        aq_grid_definition_name.value = info.data.aqGridDefinitionName;
        task_metric.value = info.data.taskMetricName;
        task_name.value = info.data.taskName;
        task_pop_id.value = info.data.populationDatasetId;

        task_uuid_with_type.value = "E-" + info.data.taskUuid;
        valuation_task_uuid_with_type.value = "";
        valuation_task_name.value = "";
        componentKey.value += 1;
      })();
    });

    return {
      task_uuid_with_type,
      valuation_task_uuid_with_type,
      valuation_task_name,
      batch_task_id,
      valuation_grid_id,
      valuation_grid_name,
      componentKey,
      pollutant_name,
      task_pre_policy,
      aq_grid_definition_name,
      task_metric,
      task_name,
      task_pop_id,
      elapsed_ms,
      warning,
    };
  },
});
</script>

<style lang="scss" scoped>
.task-results-page {
  padding: 10px;
  .info {
    padding-left: 20px;
    font-size: 18px;
    display: flex;
    min-height: 30px;
  }
  .label {
    width: 170px;
    font-weight: bold;
  }
  .link-to-magage-tasks {
    padding-left: 20px;
    padding-top: 10px;
    padding-bottom: 10px;
  }
  .task-results {
    padding-top: 25px;
  }
}
</style>

