<template>
  <div>
    <h3 class='justify-content-center'>
      {{user.username}}
      <small class="text-muted">Week {{week}}</small>
    </h3>
    <div class='challenge-form'>
      <challenge-edit v-for="challenge in challenges" v-bind:key="challenge.id" :challenge="challenge">
      </challenge-edit>
    </div>
  </div>
</template>

<script>
  import ChallengeEdit from "./ChallengeEdit";

  export default {
    components: {
      "challenge-edit": ChallengeEdit
    },
    data() {
      return {
        user: {
          id: null,
          username: null
        },
        week: null,
        roundId: null,
        challenges: null
      }
    },
    created() {
      this.$http.get('/api/challenges').then((response) => {
        this.user = response.data.user;
        this.week = response.data.week;
        this.roundId = response.data.roundId;
        this.challenges = response.data.challenges;
      }).catch(err => {
        console.log(err);
      });
    }
  }
</script>

<style lang="scss">
</style>