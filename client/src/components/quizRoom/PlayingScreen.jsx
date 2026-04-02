import ErrorToast from './ErrorToast';
import QuestionHeader from './QuestionHeader';
import OptionsGrid from './OptionsGrid';
import ResultFeedback from './ResultFeedback';
import LeaderboardSidebar from './LeaderboardSidebar';

const PlayingScreen = ({
    currentQuestion,
    timeLeft,
    selectedOption,
    myResult,
    leaderboard,
    errorMessage,
    onSubmitAnswer,
}) => {
    return (
        <>
            <ErrorToast message={errorMessage} />
            <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col-reverse lg:grid lg:grid-cols-4 gap-8 mt-4">
                <div className="lg:col-span-3 space-y-8 flex flex-col">
                    <QuestionHeader currentQuestion={currentQuestion} timeLeft={timeLeft} />

                    {currentQuestion?.mediaUrl && (
                        <div className="flex h-75 items-center justify-center overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                            <img
                                src={currentQuestion.mediaUrl}
                                alt="Question Media"
                                className="h-full w-full object-contain"
                            />
                        </div>
                    )}

                    <OptionsGrid
                        options={currentQuestion?.options || []}
                        selectedOption={selectedOption}
                        timeLeft={timeLeft}
                        onSubmitAnswer={onSubmitAnswer}
                        myResult={myResult}
                    />

                    <ResultFeedback myResult={myResult} />
                </div>

                <LeaderboardSidebar leaderboard={leaderboard} />
            </div>
        </>
    );
};

export default PlayingScreen;
